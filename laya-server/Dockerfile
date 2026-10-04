# Laya decision-model server for Murmur, built for Google Cloud Run.
FROM python:3.12-slim

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface \
    LAYA_HOST=0.0.0.0 \
    LAYA_PORT=8080 \
    LAYA_DEVICE=cpu \
    LAYA_DEFAULT_MODEL=english
WORKDIR /home/user

# CPU-only PyTorch keeps the image small; the default wheel bundles GPU libraries.
RUN pip install --no-cache-dir --user torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir --user "laya[serve]"

# Download the checkpoints into the image. Cloud Run's disk is wiped whenever an
# instance stops, so fetching them at startup would repeat on every cold start.
RUN python -c "from laya import Router; Router(preload=True)"

EXPOSE 8080
CMD ["laya-serve"]
