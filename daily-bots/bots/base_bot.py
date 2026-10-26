from slack_sdk.errors import SlackApiError
import logging

logger = logging.getLogger(__name__)

class BaseBot:
    def __init__(self, config, slack_client):
        self.config = config
        self.slack = slack_client
        self.channel = config["slack"]["channel"]

    def send_slack(self, message: str):
        try:
            self.slack.chat_postMessage(channel=self.channel, text=message, mrkdwn=True)
        except SlackApiError as e:
            logger.error(f"Slack-API-Fehler: {e.response.get('error')}")
            raise