from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    games = [
        {
            'name': '邊走邊吃',
            'description': '雙人策略棋類遊戲，利用不同大小的棋子達成連線',
            'url': '/move-and-eat',
        }
    ]
    return render_template('index.html', games=games)

# Move and Eat game routes
@app.route('/move-and-eat')
def move_and_eat():
    return render_template('move-and-eat/index.html')

# Static files for Move and Eat
@app.route('/move-and-eat/static/<path:filename>')
def move_and_eat_static(filename):
    from flask import send_from_directory
    import os
    return send_from_directory(os.path.join(app.root_path, 'Move_and_Eat', 'static'), filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)