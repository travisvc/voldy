FROM python:3.11-slim

WORKDIR /app

COPY src/requirements.txt ./src/
RUN pip install --no-cache-dir -r src/requirements.txt

CMD ["python", "-m", "src.api.run"]
