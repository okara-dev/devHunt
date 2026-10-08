from enum import Enum


class NeoState(Enum):
    IDLE = "idle"
    LISTENING = "listening"
    THINKING = "thinking"
    SPEAKING = "speaking"
    EXECUTING = "executing"
    SHUTDOWN = "shutdown"


class StateManager:
    def __init__(self):
        self._state = NeoState.IDLE

    @property
    def state(self) -> NeoState:
        return self._state

    def set(self, new_state: NeoState):
        self._state = new_state

    def is_idle(self) -> bool:
        return self._state == NeoState.IDLE

    def __repr__(self):
        return f"StateManager(state={self._state.value})"