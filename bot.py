import requests
import schedule
import time
from datetime import datetime

PAGE_TOKEN = "EAAQCktuWYFsBR09lFWg0urjUG9EZA6mGfTETO8IlgO0lAAHjkkkYjOaeeQXYlrV4qEuaO79A2VoahcMKF8irCR3ZC5dAIjCJtzrTDZBllBW0MgNsqzcjxUon0Bb3ocnI35c6lMApZAeB5mSt4eugtOW7A9kqlvE5udiTMMNvFGQjoZA17nNhYUlXA18wxoRbdmaBohlWBAtL4latN0Lr5xEHhv7e8uivW56Kq3TzBZCvXRiR3Ina2hgMZCrsAZDZD"
PAGE_ID = "500963653091071"
POST_MESSAGE = "قصة جديدة كل يوم الساعة 10 ❤️ #قصص_واقعيه"
POST_TIME = "10:00"

def post_to_facebook():
    url = f"https://graph.facebook.com/v18.0/{PAGE_ID}/feed"
    data = {
        "message": POST_MESSAGE,
        "access_token": PAGE_TOKEN
    }
    try:
        response = requests.post(url, data=data)
        result = response.json()
        if "id" in result:
            print(f"[{datetime.now()}] تم النشر بنجاح! Post ID: {result['id']}")
        else:
            print(f"[{datetime.now()}] خطأ: {result}")
    except Exception as e:
        print(f"خطأ: {e}")

schedule.every().day.at(POST_TIME).do(post_to_facebook)

print(f"البوت شغال... هينشر كل يوم الساعة {POST_TIME}")
while True:
    schedule.run_pending()
    time.sleep(60)
