FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/tmp/huggingface \
    HF_HUB_DISABLE_TELEMETRY=1 \
    OMP_NUM_THREADS=4 \
    MKL_NUM_THREADS=4

RUN apt-get update && apt-get install -y --no-install-recommends git libsndfile1 && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/Stability-AI/stable-audio-3.git /opt/stable-audio-3
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.7.1 torchaudio==2.7.1
RUN pip install --no-cache-dir /opt/stable-audio-3

WORKDIR /app
COPY app.py /app/app.py
EXPOSE 8080
CMD ["python", "/app/app.py"]
