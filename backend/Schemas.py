from marshmallow import EXCLUDE, Schema, fields, pre_load, validate


class BaseSchema(Schema):
    class Meta:
        unknown = EXCLUDE


class CategorySchema(BaseSchema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    parent_id = fields.Int(allow_none=True)
    kind = fields.Str(validate=validate.OneOf(["expense", "income"]), load_default="expense")


class IncomeSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    amount = fields.Float(required=True)
    source = fields.Str(allow_none=True)
    date = fields.Date(required=True)
    category_id = fields.Int(allow_none=True)
    notes = fields.Str(allow_none=True)
    category_name = fields.Method("get_category_name", dump_only=True)

    def get_category_name(self, obj):
        return obj.category.name if getattr(obj, "category", None) else None


class ExpenseSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    amount = fields.Float(required=True)
    date = fields.Date(required=True)
    category_id = fields.Int(allow_none=True)
    notes = fields.Str(allow_none=True)
    payment_method = fields.Str(allow_none=True)
    inventory_item_id = fields.Int(allow_none=True)
    qty = fields.Float(allow_none=True)
    category_name = fields.Method("get_category_name", dump_only=True)

    def get_category_name(self, obj):
        return obj.category.name if getattr(obj, "category", None) else None


class InvestmentTransactionSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    investment_id = fields.Int(required=True)
    kind = fields.Str(
        required=True,
        validate=validate.OneOf(["buy", "sell", "dividend", "valuation", "premium"]),
    )
    amount = fields.Float(required=True)
    units = fields.Float(allow_none=True)
    date = fields.Date(required=True)


class InvestmentSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    type = fields.Str(
        validate=validate.OneOf(["stock", "mf", "fd", "crypto", "insurance", "other"]),
        load_default="other",
    )
    platform = fields.Str(allow_none=True)
    current_value = fields.Float(load_default=0.0)
    premium_amount = fields.Float(allow_none=True)
    premium_cadence = fields.Str(
        allow_none=True, validate=validate.OneOf(["monthly", "yearly"])
    )
    contributions_prior = fields.Float(allow_none=True)
    notes = fields.Str(allow_none=True)
    transactions = fields.Nested(InvestmentTransactionSchema, many=True, dump_only=True)

    @pre_load
    def normalize_premium_fields(self, data, **kwargs):
        if not isinstance(data, dict):
            return data
        if data.get("premium_cadence") == "":
            data["premium_cadence"] = None
        if data.get("premium_amount") == "":
            data["premium_amount"] = None
        if data.get("contributions_prior") == "":
            data["contributions_prior"] = None
        return data


class InventoryItemSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    unit = fields.Str(load_default="pcs")
    current_qty = fields.Float(load_default=0.0)
    reorder_threshold = fields.Float(load_default=0.0)
    last_purchased_at = fields.Date(allow_none=True)
    default_category_id = fields.Int(allow_none=True)


class BudgetSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    category_id = fields.Int(required=True)
    month = fields.Int(required=True, validate=validate.Range(1, 12))
    year = fields.Int(required=True)
    limit_amount = fields.Float(required=True)


class RecurringTransactionSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    kind = fields.Str(required=True, validate=validate.OneOf(["income", "expense"]))
    amount = fields.Float(required=True)
    category_id = fields.Int(allow_none=True)
    cadence = fields.Str(validate=validate.OneOf(["monthly", "weekly"]), load_default="monthly")
    next_run = fields.Date(required=True)
    last_run = fields.Date(allow_none=True)
    notes = fields.Str(allow_none=True)
    is_active = fields.Bool(load_default=True)
    source = fields.Str(allow_none=True)


class ImportPayloadSchema(BaseSchema):
    """Normalized payload for Swiggy/Zomato/SMS import stubs."""

    source = fields.Str(required=True)
    raw = fields.Str(allow_none=True)
    amount = fields.Float(required=True)
    merchant = fields.Str(allow_none=True)
    ts = fields.DateTime(allow_none=True)
    category_hint = fields.Str(allow_none=True)
