# Laya decision-model server for Murmur, packaged for a Hugging Face Docker Space.
FROM python:3.12-slim

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface \
    LAYA_HOST=0.0.0.0 \
    LAYA_PORT=7860 \
    LAYA_DEVICE=cpu \
    LAYA_DEFAULT_MODEL=english
WORKDIR /home/user

# CPU-only PyTorch keeps the image small; the default wheel bundles GPU libraries.
RUN pip install --no-cache-dir --user torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir --user "laya[serve]"

EXPOSE 7860
CMD ["laya-serve"]
