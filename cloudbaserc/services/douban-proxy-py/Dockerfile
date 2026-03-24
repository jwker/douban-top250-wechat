FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir

COPY . .

EXPOSE 80

CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:80", "main:app"]