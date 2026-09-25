import os
import sys

# Ensure apps/ai-service is in sys.path
_ai_service_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "apps", "ai-service"))
if _ai_service_path not in sys.path:
    sys.path.insert(0, _ai_service_path)

from modules.embedding import *
