import json
import requests

# SES message as a Python dict
ses_message = {
    "notificationType": "Received",
    "mail": {
        "commonHeaders": {
            "from": ["csheehan630@gmail.com"],
            "to": ["contact@coldets.com"],
            "subject": "Test Subject"
        },
        "timestamp": "2024-06-08T12:00:00Z"
    },
    "content": "Hello, this is a test email body."
}

# SNS payload
payload = {
    "Type": "Notification",
    "MessageId": "test-message-id-123",
    "TopicArn": "arn:aws:sns:us-east-2:123456789012:ses-inbound-email",
    "Message": json.dumps(ses_message),
    "Timestamp": "2024-06-08T12:00:00Z",
    "SignatureVersion": "1",
    "Signature": "EXAMPLESIGNATURE",
    "SigningCertURL": "https://sns.us-east-2.amazonaws.com/SimpleNotificationService-1234567890abcdef.pem"
}

response = requests.post(
    "http://localhost:3000/api/webhooks/email/received",
    headers={"Content-Type": "application/json"},
    data=json.dumps(payload)
)

print(f"Status: {response.status_code}")
print(response.text) 