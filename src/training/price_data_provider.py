from tenacity import (
    before_log,
    retry,
    stop_after_attempt,
    wait_random_exponential,
)
from synth.utils.helpers import from_iso_to_unix_time
import logging
import requests
import bittensor as bt
from datetime import datetime
import numpy as np
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from src.core.config import Config
import time
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.DEBUG)
logger = logging.getLogger(__name__)

class PriceDataProvider:
    """
    Loads historical price data from Pyth Network API.
    
    From the original code in synth.validator.price_data_provider, rewritten such that 
    no validator_request object is needed but just the needed parameters.
    """
    
    BASE_URL = "https://benchmarks.pyth.network/v1/shims/tradingview/history"

    TOKEN_MAP = {
        "BTC": "Crypto.BTC/USD",
        "ETH": "Crypto.ETH/USD",
        "XAU": "Crypto.XAUT/USD",
        "SOL": "Crypto.SOL/USD",
    }

    @retry(
    stop=stop_after_attempt(8), 
    wait=wait_random_exponential(multiplier=2, max=30), 
    reraise=True,
    before_sleep=before_log(logger, logging.WARNING), # this logs if the function is called again after a failed attempt
    )
    def fetch_data(self, asset: str, start_time: datetime, time_length: int, time_increment: int, lock=None, request_history=None) -> list:
        """
        Fetch real prices data from an external REST service.
        
        Args:
            asset: Asset symbol (BTC, ETH, SOL, XAU) from config
            start_time: Start datetime
            time_length: Time length in seconds
            time_increment: Time increment in seconds
            lock: Lock object for rate limiting (because of multiprocessing)
            request_history: List of request times for rate limiting
        Returns:
            List of prices at each time increment
        """
        if lock is not None and request_history is not None:
            with lock:
                now = time.time()
                rate_limit_period = Config.RATE_LIMIT_PERIOD
                rate_limit_calls = Config.RATE_LIMIT_CALLS
                # Clean old entries (older than 10s)
                while len(request_history) > 0 and request_history[0] <= now - rate_limit_period:
                    request_history.pop(0)

                if len(request_history) >= rate_limit_calls: # Your limit
                    sleep_time = rate_limit_period - (now - request_history[0])
                    if sleep_time > 0:
                        time.sleep(sleep_time)
                
                request_history.append(time.time())
        start_time_int = from_iso_to_unix_time(start_time.isoformat())
        end_time_int = start_time_int + time_length

        params = {
            "symbol": self._get_token_mapping(str(asset)),
            "resolution": 1,
            "from": start_time_int,
            "to": end_time_int,
        }

        response = requests.get(self.BASE_URL, params=params)
        response.raise_for_status()

        data = response.json()

        transformed_data = self._transform_data(
            data,
            start_time_int,
            int(time_increment),
            int(time_length),
        )

        return transformed_data
        
    @staticmethod
    def _transform_data(
        data, start_time_int: int, time_increment: int, time_length: int
    ) -> list:
        if data is None or len(data) == 0 or len(data["t"]) == 0:
            return []

        time_end_int = start_time_int + time_length
        timestamps = [
            t
            for t in range(
                start_time_int, time_end_int + time_increment, time_increment
            )
        ]

        if len(timestamps) != int(time_length / time_increment) + 1:
            # Note: this part of code should never be activated; just included for precaution
            if len(timestamps) == int(time_length / time_increment) + 2:
                if data["t"][-1] < timestamps[1]:
                    timestamps = timestamps[:-1]
                elif data["t"][0] > timestamps[0]:
                    timestamps = timestamps[1:]
            else:
                return []

        close_prices_dict = {t: c for t, c in zip(data["t"], data["c"])}
        transformed_data = [np.nan for _ in range(len(timestamps))]

        for idx, t in enumerate(timestamps):
            if t in close_prices_dict:
                transformed_data[idx] = close_prices_dict[t]

        return transformed_data

    @staticmethod
    def _get_token_mapping(token: str) -> str:
        """
        Retrieve the mapped value for a given token.
        """
        if token in PriceDataProvider.TOKEN_MAP:
            return PriceDataProvider.TOKEN_MAP[token]
        else:
            raise ValueError(f"Token '{token}' is not supported.")

