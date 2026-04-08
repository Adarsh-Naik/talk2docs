=> Meory + Citation

# Run Backend
cd /talk2docs_env
source .venv/bin/activate
cd /talk2docs/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Run Frontend
cd /talk2docs/frontend
npm run dev
# talk2docs
