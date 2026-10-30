from app.pep import rbac


def pytest_runtest_setup() -> None:
    with rbac._lock:
        rbac._call_windows.clear()
