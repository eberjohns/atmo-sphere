# Backend server setup

How to use:
```bash
# For macOS/Linux
python3 -m venv venv
source venv/bin/activate

# For Windows
python -m venv venv
.\venv\Scripts\activate
```

Create the .env and paste your key:
```bash
cp .env.example .env
```

To run:
```bash
#install dependencies
pip install -r requirements.txt

#run server
uvicorn main:app --reload
```
