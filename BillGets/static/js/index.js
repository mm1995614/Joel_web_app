document.addEventListener('DOMContentLoaded', function() {
    const createGroupBtn = document.getElementById('create-group-btn');
    const createModal = document.getElementById('create-modal');
    const pinModal = document.getElementById('pin-modal');
    const joinModal = document.getElementById('join-modal');
    const createGroupForm = document.getElementById('create-group-form');
    const joinGroupForm = document.getElementById('join-group-form');
    const pinInput = document.getElementById('pin-input');
    const joinGroupBtns = document.querySelectorAll('.join-group-btn');
    
    createGroupBtn.addEventListener('click', function() {
        createModal.style.display = 'block';
    });
    
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    createGroupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const groupName = document.getElementById('group-name').value;
        
        fetch('/create_group', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: groupName })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                createModal.style.display = 'none';
                document.getElementById('generated-pin').textContent = data.pin_code;
                pinModal.style.display = 'block';
                
                document.getElementById('goto-group').onclick = function() {
                    window.location.href = '/group/' + data.group_id;
                };
            }
        })
        .catch(error => {
            alert('建立群組時發生錯誤');
            console.error('Error:', error);
        });
    });
    
    function joinGroup(pinCode) {
        fetch('/join_group', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pin_code: pinCode })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/group/' + data.group_id;
            } else {
                alert(data.message || 'PIN碼錯誤');
            }
        })
        .catch(error => {
            alert('加入群組時發生錯誤');
            console.error('Error:', error);
        });
    }
    
    joinGroupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const pin = pinInput.value.trim();
        if (pin.length === 6) {
            joinGroup(pin);
            joinModal.style.display = 'none';
        } else {
            alert('請輸入6位數PIN碼');
        }
    });
    
    joinGroupBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            joinModal.style.display = 'block';
            pinInput.value = '';
            pinInput.focus();
        });
    });
});