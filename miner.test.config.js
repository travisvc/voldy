module.exports = {
  apps: [
    {
      name: "miner",
      interpreter: "python3",
      script: "synth/miner/pipeline/live_miner/main.py",
      args: "--netuid 247 --logging.debug  --subtensor.network test --wallet.name sn50-testnet --wallet.hotkey default --axon.port 2003 --blacklist.validator.min_stake 0",
      env: {
        PYTHONPATH: ".",
      },
    },
  ],
};
