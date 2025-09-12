from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    games = [
        {
            'name': '邊走邊吃',
            'description': '雙人策略棋類遊戲，利用不同大小的棋子達成連線',
            'url': '/move-and-eat',
            'button_text': '開始遊戲'
        },
        {
            'name': 'BillGets',
            'description': '記帳分帳小幫手，輕鬆管理群組消費與帳務分攤',
            'url': '/billgets',
            'button_text': '開始分帳'
        }
    ]
    return render_template('index.html', games=games)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)