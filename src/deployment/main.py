import time
import bittensor as bt
from neurons.miner import Miner
from src.deployment.deployer import Deployer


def main():
    time.sleep(3)
    bt.logging.info("Deploying miner...")
    
    deployer = Deployer()
    miner = Miner(model_logic_fn=deployer.create_miner_logic())
    
    with miner:
        while True:
            miner.print_info()
            time.sleep(60)


if __name__ == "__main__":
    main()

