from src.core.constants import WEEKS_OF_DATA_3600, WEEKS_OF_DATA_86400

class Config:
    NUM_SIMULATIONS = 1000
    TIME_CONFIGS = {3600: (60, WEEKS_OF_DATA_3600), 86400: (300, WEEKS_OF_DATA_86400)}
    ASSETS = ['BTC', 'ETH', 'SOL', 'XAU']
    PARAMS_PATH = 'src/core/parameters.json'
    PERFORMANCE_PATH = 'src/core/performance.json'
    RATE_LIMIT_CALLS = 29
    RATE_LIMIT_PERIOD = 10.1