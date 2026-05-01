"""SQLAlchemy models for Smart Budget App."""
from datetime import date

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    kind = db.Column(db.String(16), nullable=False, default="expense")  # expense | income

    parent = db.relationship("Category", remote_side=[id], backref=db.backref("children", lazy="dynamic"))


class Income(db.Model):
    __tablename__ = "incomes"

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(128))
    date = db.Column(db.Date, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    category = db.relationship("Category", foreign_keys=[category_id])


class InventoryItem(db.Model):
    __tablename__ = "inventory_items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(256), nullable=False)
    unit = db.Column(db.String(32), nullable=False, default="pcs")
    current_qty = db.Column(db.Float, nullable=False, default=0.0)
    reorder_threshold = db.Column(db.Float, nullable=False, default=0.0)
    last_purchased_at = db.Column(db.Date, nullable=True)
    default_category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)

    default_category = db.relationship("Category", foreign_keys=[default_category_id])
    expenses = db.relationship("Expense", back_populates="inventory_item")


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    payment_method = db.Column(db.String(64), nullable=True)
    inventory_item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.id"), nullable=True)
    qty = db.Column(db.Float, nullable=True)

    category = db.relationship("Category", foreign_keys=[category_id])
    inventory_item = db.relationship("InventoryItem", back_populates="expenses")


class Investment(db.Model):
    __tablename__ = "investments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(256), nullable=False)
    type = db.Column(
        db.String(32), nullable=False, default="other"
    )  # stock | mf | fd | crypto | insurance | other
    platform = db.Column(db.String(128), nullable=True)
    current_value = db.Column(db.Float, nullable=False, default=0.0)
    # Planned recurring outflow/investment: SIP instalment (mf), premium (insurance), etc. (logged via buy/premium txs)
    premium_amount = db.Column(db.Float, nullable=True)
    premium_cadence = db.Column(db.String(16), nullable=True)  # monthly | yearly
    # Contributions made before tracking transactions here (added to sum of buy + premium txs for "total invested")
    contributions_prior = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    transactions = db.relationship(
        "InvestmentTransaction", back_populates="investment", cascade="all, delete-orphan", lazy="dynamic"
    )


class InvestmentTransaction(db.Model):
    __tablename__ = "investment_transactions"

    id = db.Column(db.Integer, primary_key=True)
    investment_id = db.Column(db.Integer, db.ForeignKey("investments.id"), nullable=False)
    kind = db.Column(db.String(32), nullable=False)  # buy | sell | dividend | valuation | premium
    amount = db.Column(db.Float, nullable=False, default=0.0)
    units = db.Column(db.Float, nullable=True)
    date = db.Column(db.Date, nullable=False, default=date.today)

    investment = db.relationship("Investment", back_populates="transactions")


class Budget(db.Model):
    __tablename__ = "budgets"
    __table_args__ = (db.UniqueConstraint("category_id", "month", "year", name="uq_budget_cat_month_year"),)

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    limit_amount = db.Column(db.Float, nullable=False)

    category = db.relationship("Category")


class RecurringTransaction(db.Model):
    __tablename__ = "recurring_transactions"

    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(16), nullable=False)  # income | expense
    amount = db.Column(db.Float, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    cadence = db.Column(db.String(16), nullable=False, default="monthly")  # monthly | weekly
    next_run = db.Column(db.Date, nullable=False)
    last_run = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    source = db.Column(db.String(128), nullable=True)  # for income source label

    category = db.relationship("Category")
