from flask.testing import FlaskClient


def secondary_client(primary_client: FlaskClient) -> FlaskClient:
    client = primary_client.application.test_client()
    client.environ_base.update(primary_client.environ_base)
    return client
