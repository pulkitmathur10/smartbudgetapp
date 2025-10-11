from marshmallow import Schema, fields

class IncomeSchema(Schema):
    id = fields.Int(dump_only=True)
    amount = fields.Float(required=True)
    source = fields.Str()
    date = fields.Date(required=True)

class ExpenseSchema(Schema):
    id = fields.Int(dump_only=True)
    amount = fields.Float(required=True)
    category = fields.Str()
    date = fields.Date(required=True)