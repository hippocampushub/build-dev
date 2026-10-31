import json
import logging
import time
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

log = logging.getLogger("hh")

USER_AGENT = "HippocampusHub-fetcher/2.0 (+https://www.hippocampushub.eu)"
TIMEOUT = 60


def create_session():
    """requests.Session with automatic retries on transient errors."""
    retry = Retry(
        total=5,
        backoff_factor=2,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "HEAD", "POST"),
    )
    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    adapter = HTTPAdapter(max_retries=retry, pool_maxsize=16)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


def get_json(session, url, **kwargs):
    response = session.get(url, timeout=TIMEOUT, **kwargs)
    response.raise_for_status()
    return response.json()


def post_json(session, url, payload, **kwargs):
    response = session.post(url, json=payload, timeout=TIMEOUT, **kwargs)
    response.raise_for_status()
    return response.json()


def url_exists(session, url):
    try:
        response = session.head(url, timeout=TIMEOUT, allow_redirects=True)
        return response.status_code == 200
    except requests.RequestException:
        return False


def load_config(name):
    path = Path(__file__).resolve().parent.parent / "config" / f"{name}.json"
    with open(path) as f:
        return json.load(f)


def polite_sleep(seconds):
    if seconds:
        time.sleep(seconds)
