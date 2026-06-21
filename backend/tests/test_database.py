import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database import hash_password, verify_password, generate_token


def test_hash_and_verify_password():
    password = "test_password_123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True


def test_verify_wrong_password():
    password = "correct_password"
    hashed = hash_password(password)
    assert verify_password("wrong_password", hashed) is False


def test_generate_token():
    token1 = generate_token()
    token2 = generate_token()
    assert len(token1) == 64
    assert token1 != token2
