from dataclasses import dataclass, asdict


@dataclass
class ActionWallet:
    search_products: bool = True
    compare_products: bool = True
    negotiate_offer: bool = True
    add_to_cart: bool = True
    execute_payment: bool = False
    payment_requires_confirmation: bool = True
    maximum_transaction: int = 70000

    def to_dict(self) -> dict:
        return asdict(self)


DEFAULT_WALLET = ActionWallet()
