# Synth Mining

## Get Started using Docker

```bash
docker compose up --build -d
```

```bash
# Remove everything: containers, networks, images, volumes, build cache
# IMPORTANT: This will also remove everything from other projects
docker system prune -a --volumes
docker compose down -v
```

## Get Started using a virtual environment

Run in the root of the synth-miner folder

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r src/requirements.txt
```

Start the training pipeline

```bash
python3 -m src.training.main
```

Start benchmarking

```bash
python3 -m src.training.main
```

Deploy a miner on testnet or mainnet

```bash
python3 -m src.training.main
```