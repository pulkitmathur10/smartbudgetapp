from flask import Flask, request, jsonify
from flask_migrate import Migrate
from flask_cors import CORS
from models import db, Income, Expense
from schemas import IncomeSchema, ExpenseSchema
from datetime import date

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///budget.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    Migrate(app, db)
    CORS(app)

    income_schema = IncomeSchema()
    expenses_schema = ExpenseSchema(many=True)
    incomes_schema = IncomeSchema(many=True)
    expense_schema = ExpenseSchema()

    @app.route('/income', methods=['POST'])
    def add_income():
        data = income_schema.load(request.json)
        inc = Income(**data)
        db.session.add(inc)
        db.session.commit()
        return income_schema.jsonify(inc), 201

    @app.route('/income', methods=['GET'])
    def get_incomes():
        all_inc = Income.query.order_by(Income.date.desc()).all()
        return incomes_schema.jsonify(all_inc)

    @app.route('/expense', methods=['POST'])
    def add_expense():
        data = expense_schema.load(request.json)
        exp = Expense(**data)
        db.session.add(exp)
        db.session.commit()
        return expense_schema.jsonify(exp), 201

    @app.route('/expense', methods=['GET'])
    def get_expenses():
        all_exp = Expense.query.order_by(Expense.date.desc()).all()
        return expenses_schema.jsonify(all_exp)

    @app.route('/summary', methods=['GET'])
    def get_summary():
        month = request.args.get('month', date.today().month, type=int)
        year = request.args.get('year', date.today().year, type=int)

        total_inc = db.session.query(db.func.sum(Income.amount))\
                     .filter(db.extract('month', Income.date)==month,
                             db.extract('year', Income.date)==year).scalar() or 0
        total_exp = db.session.query(db.func.sum(Expense.amount))\
                     .filter(db.extract('month', Expense.date)==month,
                             db.extract('year', Expense.date)==year).scalar() or 0

        balance = total_inc - total_exp
        return jsonify({
            'income': total_inc,
            'expenses': total_exp,
            'balance': balance
        })

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)