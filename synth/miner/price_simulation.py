import requests


import numpy as np

from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
)



# Hermes Pyth API documentation: https://hermes.pyth.network/docs/

TOKEN_MAP = {
    "BTC": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    "ETH": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    "XAU": "765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2",
    "SOL": "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
}

pyth_base_url = "https://hermes.pyth.network/v2/updates/price/latest"


@retry(
    stop=stop_after_attempt(5),
    wait=wait_random_exponential(multiplier=2),
    reraise=True,
)
def get_asset_price(asset="BTC") -> float | None:
    pyth_params = {"ids[]": [TOKEN_MAP[asset]]}
    response = requests.get(pyth_base_url, params=pyth_params)
    if response.status_code != 200:
        print("Error in response of Pyth API")
        return None

    data = response.json()
    parsed_data = data.get("parsed", [])

    asset = parsed_data[0]
    price = int(asset["price"]["price"])
    expo = int(asset["price"]["expo"])

    live_price: float = price * (10**expo)

    return live_price

def simulate_crypto_price_paths(
    current_price: float,
    time_increment: int,
    time_length: int,
    num_simulations: int,
    sigma: float,
) -> np.ndarray:
    """
    Simulate multiple crypto asset price paths.
    """

    price_paths = []
    for _ in range(num_simulations):
        price_path = simulate_single_price_path(
            current_price, time_increment, time_length, sigma
        )
        price_paths.append(price_path)
    
    return np.array(price_paths)


def plot_price_paths(price_paths: np.ndarray, filename: str | None = None, show: bool = False) -> None:
    """
    Plot multiple price paths.

    - `price_paths` should be an array of shape (num_simulations, path_length).
    - If `filename` is provided the plot is saved to that path as PNG.
    - If `show` is True, the plot will be displayed (blocking).
    """
    try:
        import matplotlib.pyplot as plt
    except Exception as e:
        raise RuntimeError("matplotlib is required for plotting") from e

    num_simulations = price_paths.shape[0]
    path_length = price_paths.shape[1]

    plt.figure(figsize=(10, 6))
    for i in range(num_simulations):
        plt.plot(price_paths[i], lw=0.8, alpha=0.8)

    plt.xlabel("Step")
    plt.ylabel("Price")
    plt.title(f"Simulated Price Paths (n={num_simulations})")
    plt.grid(alpha=0.3)

    if filename:
        plt.savefig(filename, bbox_inches="tight")
    if show:
        plt.show()
    else:
        plt.close()
