from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.middleware.proxy_fix import ProxyFix
import os
from datetime import datetime, date
import random
import string

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
app.config['SECRET_KEY'] = 'billgets-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///billgets.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Group(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    pin_code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    members = db.relationship('Member', backref='group', lazy=True, cascade='all, delete-orphan')
    bills = db.relationship('Bill', backref='group', lazy=True, cascade='all, delete-orphan')
    categories = db.relationship('Category', backref='group', lazy=True, cascade='all, delete-orphan')
    currencies = db.relationship('Currency', backref='group', lazy=True, cascade='all, delete-orphan')

class Member(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=False)

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=False)

class Currency(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(3), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    rate_to_twd = db.Column(db.Float, nullable=False, default=1.0)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=False)

class Bill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payer_id = db.Column(db.Integer, db.ForeignKey('member.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    currency_id = db.Column(db.Integer, db.ForeignKey('currency.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=False)
    bill_date = db.Column(db.Date, nullable=False, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    payer = db.relationship('Member', backref='bills_paid')
    category = db.relationship('Category', backref='bills')
    currency = db.relationship('Currency', backref='bills')
    splits = db.relationship('BillSplit', backref='bill', cascade='all, delete-orphan')

class BillSplit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bill_id = db.Column(db.Integer, db.ForeignKey('bill.id'), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey('member.id'), nullable=False)
    amount = db.Column(db.Float, nullable=True)  # Specific amount, null means equal split
    share_type = db.Column(db.String(20), nullable=False, default='equal')  # 'equal' or 'fixed'
    
    member = db.relationship('Member', backref='bill_splits')

@app.route('/')
def index():
    groups = Group.query.all()
    return render_template('index.html', groups=groups)

@app.route('/create_group', methods=['POST'])
def create_group():
    data = request.get_json()
    name = data.get('name')
    
    pin_code = ''.join(random.choices(string.digits, k=6))
    
    group = Group(name=name, pin_code=pin_code)
    db.session.add(group)
    db.session.commit()
    
    default_currency = Currency(code='TWD', name='台幣', rate_to_twd=1.0, group_id=group.id)
    default_categories = [
        Category(name='食物', group_id=group.id),
        Category(name='交通', group_id=group.id),
        Category(name='娛樂', group_id=group.id),
        Category(name='住宿', group_id=group.id),
        Category(name='其他', group_id=group.id)
    ]
    
    db.session.add(default_currency)
    db.session.add_all(default_categories)
    db.session.commit()
    
    return jsonify({'success': True, 'pin_code': pin_code, 'group_id': group.id})

@app.route('/join_group', methods=['POST'])
def join_group():
    data = request.get_json()
    pin_code = data.get('pin_code')
    
    group = Group.query.filter_by(pin_code=pin_code).first()
    if group:
        session['group_id'] = group.id
        return jsonify({'success': True, 'group_id': group.id})
    else:
        return jsonify({'success': False, 'message': 'PIN碼錯誤'})

@app.route('/group/<int:group_id>')
def group_page(group_id):
    group = Group.query.get_or_404(group_id)
    session['group_id'] = group_id
    return render_template('group.html', group=group)

@app.route('/api/group/<int:group_id>/members')
def get_members(group_id):
    members = Member.query.filter_by(group_id=group_id).all()
    return jsonify([{'id': m.id, 'name': m.name} for m in members])

@app.route('/api/group/<int:group_id>/categories')
def get_categories(group_id):
    categories = Category.query.filter_by(group_id=group_id).all()
    return jsonify([{'id': c.id, 'name': c.name} for c in categories])

@app.route('/api/group/<int:group_id>/currencies')
def get_currencies(group_id):
    currencies = Currency.query.filter_by(group_id=group_id).all()
    return jsonify([{'id': c.id, 'code': c.code, 'name': c.name, 'rate_to_twd': c.rate_to_twd} for c in currencies])

@app.route('/api/group/<int:group_id>/bills')
def get_bills(group_id):
    bills = db.session.query(Bill).join(Member).join(Category).join(Currency).filter(Bill.group_id == group_id).all()
    
    search = request.args.get('search', '')
    category_filter = request.args.get('category')
    payer_filter = request.args.get('payer')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    bills_data = []
    for bill in bills:
        if search and search.lower() not in bill.name.lower():
            continue
        if category_filter and str(bill.category_id) != category_filter:
            continue
        if payer_filter and str(bill.payer_id) != payer_filter:
            continue
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            if bill.bill_date < start_date_obj:
                continue
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            if bill.bill_date > end_date_obj:
                continue
            
        split_members = [split.member.name for split in bill.splits] if bill.splits else [m.name for m in Member.query.filter_by(group_id=group_id).all()]
        bills_data.append({
            'id': bill.id,
            'name': bill.name,
            'amount': bill.amount,
            'payer_id': bill.payer_id,
            'payer_name': bill.payer.name,
            'category_id': bill.category_id,
            'category_name': bill.category.name,
            'currency_id': bill.currency_id,
            'currency_code': bill.currency.code,
            'split_members': split_members,
            'split_member_ids': [split.member_id for split in bill.splits] if bill.splits else [],
            'split_details': [{
                'member_id': split.member_id,
                'share_type': split.share_type,
                'amount': split.amount
            } for split in bill.splits] if bill.splits else [],
            'bill_date': bill.bill_date.strftime('%Y/%m/%d'),
            'bill_date_input': bill.bill_date.strftime('%Y-%m-%d'),  # For HTML date input
            'created_at': bill.created_at.strftime('%Y-%m-%d %H:%M')
        })
    
    return jsonify(bills_data)

@app.route('/api/group/<int:group_id>/bills', methods=['POST'])
def add_bill(group_id):
    data = request.get_json()
    
    # Parse date
    bill_date = datetime.strptime(data['bill_date'], '%Y-%m-%d').date()
    
    bill = Bill(
        name=data['name'],
        amount=float(data['amount']),
        payer_id=int(data['payer_id']),
        category_id=int(data['category_id']),
        currency_id=int(data['currency_id']),
        group_id=group_id,
        bill_date=bill_date
    )
    
    db.session.add(bill)
    db.session.flush()
    
    split_data = data.get('split_data', [])
    if not split_data:
        # Default: all members equal split
        all_members = Member.query.filter_by(group_id=group_id).all()
        for member in all_members:
            split = BillSplit(
                bill_id=bill.id,
                member_id=member.id,
                share_type='equal'
            )
            db.session.add(split)
    else:
        for split_info in split_data:
            split = BillSplit(
                bill_id=bill.id,
                member_id=int(split_info['member_id']),
                amount=float(split_info['amount']) if split_info.get('amount') else None,
                share_type=split_info.get('share_type', 'equal')
            )
            db.session.add(split)
    
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/group/<int:group_id>/members', methods=['POST'])
def add_member(group_id):
    data = request.get_json()
    member = Member(name=data['name'], group_id=group_id)
    db.session.add(member)
    db.session.commit()
    return jsonify({'success': True, 'id': member.id})

@app.route('/api/group/<int:group_id>/categories', methods=['POST'])
def add_category(group_id):
    data = request.get_json()
    category = Category(name=data['name'], group_id=group_id)
    db.session.add(category)
    db.session.commit()
    return jsonify({'success': True, 'id': category.id})

@app.route('/api/group/<int:group_id>/currencies', methods=['POST'])
def add_currency(group_id):
    data = request.get_json()
    currency = Currency(
        code=data['code'],
        name=data['name'],
        rate_to_twd=float(data['rate_to_twd']),
        group_id=group_id
    )
    db.session.add(currency)
    db.session.commit()
    return jsonify({'success': True, 'id': currency.id})

@app.route('/api/group/<int:group_id>/split')
def calculate_split(group_id):
    bills = Bill.query.filter_by(group_id=group_id).all()
    members = Member.query.filter_by(group_id=group_id).all()
    
    if not members:
        return jsonify([])
    
    member_paid = {}
    member_owed = {}
    
    for member in members:
        member_paid[member.id] = 0
        member_owed[member.id] = 0
    
    for bill in bills:
        amount_twd = bill.amount * bill.currency.rate_to_twd
        member_paid[bill.payer_id] += amount_twd
        
        if bill.splits:
            # Calculate splits based on new logic
            fixed_total = sum(split.amount * bill.currency.rate_to_twd for split in bill.splits if split.share_type == 'fixed' and split.amount)
            equal_splits = [split for split in bill.splits if split.share_type == 'equal']
            remaining_amount = amount_twd - fixed_total
            
            for split in bill.splits:
                if split.share_type == 'fixed' and split.amount:
                    member_owed[split.member_id] += split.amount * bill.currency.rate_to_twd
                elif split.share_type == 'equal' and equal_splits:
                    equal_share = remaining_amount / len(equal_splits)
                    member_owed[split.member_id] += equal_share
        else:
            # Default: all members equal split
            per_person_amount = amount_twd / len(members)
            for member in members:
                member_owed[member.id] += per_person_amount
    
    debts = []
    for member in members:
        balance = member_paid[member.id] - member_owed[member.id]
        if balance < -1:
            debts.append({
                'member_name': member.name,
                'balance': balance,
                'owes': abs(balance)
            })
        elif balance > 1:
            debts.append({
                'member_name': member.name,
                'balance': balance,
                'receives': balance
            })
    
    creditors = [d for d in debts if 'receives' in d]
    debtors = [d for d in debts if 'owes' in d]
    
    settlements = []
    for debtor in debtors:
        remaining_debt = debtor['owes']
        for creditor in creditors:
            if remaining_debt <= 0:
                break
            if creditor.get('receives', 0) <= 0:
                continue
                
            payment = min(remaining_debt, creditor['receives'])
            settlements.append({
                'from': debtor['member_name'],
                'to': creditor['member_name'],
                'amount': round(payment, 0)
            })
            
            remaining_debt -= payment
            creditor['receives'] -= payment
    
    return jsonify(settlements)

@app.route('/api/group/<int:group_id>', methods=['PUT'])
def update_group(group_id):
    data = request.get_json()
    group = Group.query.get_or_404(group_id)
    
    if 'name' in data:
        group.name = data['name']
    
    if 'pin_code' in data:
        # Validate PIN code format (6 digits)
        pin_code = str(data['pin_code']).strip()
        if not pin_code.isdigit() or len(pin_code) != 6:
            return jsonify({'success': False, 'error': 'PIN碼必須為6位數字'}), 400
        
        group.pin_code = pin_code
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/group/<int:group_id>', methods=['DELETE'])
def delete_group(group_id):
    group = Group.query.get_or_404(group_id)
    
    try:
        # Check for related data and delete in proper order
        
        # First delete all bill splits related to this group's bills
        bills = Bill.query.filter_by(group_id=group_id).all()
        for bill in bills:
            BillSplit.query.filter_by(bill_id=bill.id).delete()
        
        # Then delete all bills
        Bill.query.filter_by(group_id=group_id).delete()
        
        # Delete all members
        Member.query.filter_by(group_id=group_id).delete()
        
        # Delete all categories  
        Category.query.filter_by(group_id=group_id).delete()
        
        # Delete all currencies
        Currency.query.filter_by(group_id=group_id).delete()
        
        # Finally delete the group
        db.session.delete(group)
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting group {group_id}: {str(e)}")
        return jsonify({'success': False, 'error': f'刪除群組時發生錯誤: {str(e)}'}), 500

# Member CRUD operations
@app.route('/api/member/<int:member_id>', methods=['PUT'])
def update_member(member_id):
    data = request.get_json()
    member = Member.query.get_or_404(member_id)
    member.name = data['name']
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/member/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    member = Member.query.get_or_404(member_id)
    
    try:
        # Check if member has any bills as payer
        bills_count = Bill.query.filter_by(payer_id=member_id).count()
        if bills_count > 0:
            return jsonify({'success': False, 'error': '此成員有相關的付款記錄，無法刪除'}), 400
        
        # Check if member has any bill splits
        splits_count = BillSplit.query.filter_by(member_id=member_id).count()
        if splits_count > 0:
            return jsonify({'success': False, 'error': '此成員有相關的分帳記錄，無法刪除'}), 400
        
        # If no related records, delete the member
        db.session.delete(member)
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting member {member_id}: {str(e)}")
        return jsonify({'success': False, 'error': f'刪除時發生錯誤: {str(e)}'}), 500

# Category CRUD operations
@app.route('/api/category/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    data = request.get_json()
    category = Category.query.get_or_404(category_id)
    category.name = data['name']
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/category/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    category = Category.query.get_or_404(category_id)
    
    # Check if category has any bills
    bills = Bill.query.filter_by(category_id=category_id).first()
    if bills:
        return jsonify({'success': False, 'error': '此類別有相關的帳單記錄，無法刪除'}), 400
    
    try:
        db.session.delete(category)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': '刪除時發生錯誤'}), 500

# Currency CRUD operations
@app.route('/api/currency/<int:currency_id>', methods=['PUT'])
def update_currency(currency_id):
    data = request.get_json()
    currency = Currency.query.get_or_404(currency_id)
    currency.code = data['code']
    currency.name = data['name']
    currency.rate_to_twd = float(data['rate_to_twd'])
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/currency/<int:currency_id>', methods=['DELETE'])
def delete_currency(currency_id):
    currency = Currency.query.get_or_404(currency_id)
    
    # Check if currency has any bills
    bills = Bill.query.filter_by(currency_id=currency_id).first()
    if bills:
        return jsonify({'success': False, 'error': '此幣別有相關的帳單記錄，無法刪除'}), 400
    
    try:
        db.session.delete(currency)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': '刪除時發生錯誤'}), 500

# Bill CRUD operations
@app.route('/api/bill/<int:bill_id>', methods=['PUT'])
def update_bill(bill_id):
    data = request.get_json()
    bill = Bill.query.get_or_404(bill_id)
    
    bill.name = data['name']
    bill.amount = float(data['amount'])
    bill.payer_id = int(data['payer_id'])
    bill.category_id = int(data['category_id'])
    bill.currency_id = int(data['currency_id'])
    bill.bill_date = datetime.strptime(data['bill_date'], '%Y-%m-%d').date()
    
    # Update split members
    BillSplit.query.filter_by(bill_id=bill_id).delete()
    
    split_data = data.get('split_data', [])
    if not split_data:
        # Default: all members equal split
        all_members = Member.query.filter_by(group_id=bill.group_id).all()
        for member in all_members:
            split = BillSplit(
                bill_id=bill.id,
                member_id=member.id,
                share_type='equal'
            )
            db.session.add(split)
    else:
        # Custom split
        for split_info in split_data:
            split = BillSplit(
                bill_id=bill.id,
                member_id=split_info['member_id'],
                share_type=split_info['share_type'],
                amount=split_info.get('amount')
            )
            db.session.add(split)
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/bill/<int:bill_id>', methods=['DELETE'])
def delete_bill(bill_id):
    bill = Bill.query.get_or_404(bill_id)
    db.session.delete(bill)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/group/<int:group_id>/member-details/<int:member_id>')
def get_member_details(group_id, member_id):
    member = Member.query.get_or_404(member_id)
    
    # Bills paid by this member
    bills_paid = Bill.query.filter_by(payer_id=member_id, group_id=group_id).all()
    
    # Bills split by this member
    bills_split = db.session.query(Bill).join(BillSplit).filter(
        BillSplit.member_id == member_id,
        Bill.group_id == group_id
    ).all()
    
    paid_details = []
    for bill in bills_paid:
        split_members = [split.member.name for split in bill.splits] if bill.splits else [m.name for m in Member.query.filter_by(group_id=group_id).all()]
        paid_details.append({
            'id': bill.id,
            'name': bill.name,
            'amount': bill.amount,
            'currency_code': bill.currency.code,
            'category_name': bill.category.name,
            'split_members': split_members,
            'bill_date': bill.bill_date.strftime('%Y/%m/%d'),
            'bill_date_input': bill.bill_date.strftime('%Y-%m-%d'),  # For HTML date input
            'created_at': bill.created_at.strftime('%Y-%m-%d %H:%M'),
            'type': 'paid'
        })
    
    split_details = []
    for bill in bills_split:
        if bill.payer_id != member_id:  # Don't duplicate bills where member is both payer and splitter
            # Find the specific split record for this member
            member_split = BillSplit.query.filter_by(bill_id=bill.id, member_id=member_id).first()
            
            if member_split:
                if member_split.share_type == 'fixed' and member_split.amount:
                    # Fixed amount split
                    member_share = member_split.amount
                else:
                    # Equal split: calculate share from remaining amount after fixed splits
                    total_fixed = sum(s.amount for s in bill.splits if s.share_type == 'fixed' and s.amount)
                    equal_splits = [s for s in bill.splits if s.share_type == 'equal']
                    remaining_amount = bill.amount - total_fixed
                    member_share = remaining_amount / len(equal_splits) if equal_splits else 0
                
                split_details.append({
                    'id': bill.id,
                    'name': bill.name,
                    'amount': member_share,
                    'total_amount': bill.amount,
                    'currency_code': bill.currency.code,
                    'category_name': bill.category.name,
                    'payer_name': bill.payer.name,
                    'bill_date': bill.bill_date.strftime('%Y/%m/%d'),
            'bill_date_input': bill.bill_date.strftime('%Y-%m-%d'),  # For HTML date input
                    'created_at': bill.created_at.strftime('%Y-%m-%d %H:%M'),
                    'type': 'split'
                })
    
    return jsonify({
        'member_name': member.name,
        'paid_bills': paid_details,
        'split_bills': split_details
    })

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)