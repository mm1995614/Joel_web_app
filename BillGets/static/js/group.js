document.addEventListener('DOMContentLoaded', function() {
    let members = [];
    let categories = [];
    let currencies = [];
    let bills = [];
    let currentEditItem = null;
    
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const addBillForm = document.getElementById('add-bill-form');
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const editModal = document.getElementById('edit-modal');
    const editBillModal = document.getElementById('edit-bill-modal');
    
    settingsBtn.addEventListener('click', function() {
        settingsModal.style.display = 'block';
        loadSettingsData();
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
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tab + '-tab').classList.add('active');
        });
    });
    
    function loadData() {
        Promise.all([
            fetch(window.apiUrls.groupMembers).then(r => r.json()),
            fetch(window.apiUrls.groupCategories).then(r => r.json()),
            fetch(window.apiUrls.groupCurrencies).then(r => r.json())
        ]).then(([membersData, categoriesData, currenciesData]) => {
            members = membersData;
            categories = categoriesData;
            currencies = currenciesData;
            
            updateSelects();
            loadBills();
            calculateSplit();
            
            // Update settings lists if settings modal is open
            if (settingsModal.style.display === 'block') {
                renderMembers();
                renderCategories();
                renderCurrencies();
            }
        });
    }
    
    function updateSelects() {
        const payerSelect = document.getElementById('payer-select');
        const categorySelect = document.getElementById('category-select');
        const currencySelect = document.getElementById('currency-select');
        const categoryFilter = document.getElementById('category-filter');
        const payerFilter = document.getElementById('payer-filter');
        const memberCheckboxes = document.getElementById('member-checkboxes');
        const memberDetailsSelect = document.getElementById('member-details-select');
        
        // Update payer selects
        [payerSelect, document.getElementById('edit-payer-select')].forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">請選擇付款人</option>';
                members.forEach(member => {
                    select.innerHTML += `<option value="${member.id}">${member.name}</option>`;
                });
            }
        });
        
        // Update category selects
        [categorySelect, document.getElementById('edit-category-select')].forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">請選擇類別</option>';
                categories.forEach(category => {
                    select.innerHTML += `<option value="${category.id}">${category.name}</option>`;
                });
            }
        });
        categoryFilter.innerHTML = '<option value="">所有類別</option>';
        categories.forEach(category => {
            categoryFilter.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
        
        // Update currency selects
        [currencySelect, document.getElementById('edit-currency-select')].forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">請選擇幣別</option>';
                currencies.forEach(currency => {
                    select.innerHTML += `<option value="${currency.id}">${currency.code} (${currency.name})</option>`;
                });
            }
        });
        
        payerFilter.innerHTML = '<option value="">所有付款人</option>';
        members.forEach(member => {
            payerFilter.innerHTML += `<option value="${member.id}">${member.name}</option>`;
        });
        
        // Update member details select
        memberDetailsSelect.innerHTML = '<option value="">請選擇成員</option>';
        members.forEach(member => {
            memberDetailsSelect.innerHTML += `<option value="${member.id}">${member.name}</option>`;
        });
        
        // Update member checkboxes (for edit modal)
        const editMemberCheckboxes = document.getElementById('edit-member-checkboxes');
        if (editMemberCheckboxes) {
            editMemberCheckboxes.innerHTML = '';
            members.forEach(member => {
                const label = document.createElement('label');
                label.className = 'checkbox-item';
                label.innerHTML = `
                    <input type="checkbox" value="${member.id}" class="member-checkbox">
                    <span>${member.name}</span>
                `;
                editMemberCheckboxes.appendChild(label);
            });
        }
        
        // Update member split options
        updateMemberSplitOptions();
        updateMemberCheckboxState();
    }
    
    function updateMemberSplitOptions() {
        // Update add bill split options
        const memberSplitOptions = document.getElementById('member-split-options');
        if (memberSplitOptions) {
            memberSplitOptions.innerHTML = '';
            members.forEach(member => {
                const item = document.createElement('div');
                item.className = 'member-split-item';
                item.innerHTML = `
                    <input type="checkbox" class="member-split-checkbox" value="${member.id}">
                    <span class="member-name">${member.name}</span>
                    <select class="split-type-select" data-member-id="${member.id}" disabled>
                        <option value="equal">均分</option>
                        <option value="fixed">指定金額</option>
                    </select>
                    <input type="number" class="split-amount-input" data-member-id="${member.id}" 
                           step="0.01" placeholder="金額" disabled>
                `;
                memberSplitOptions.appendChild(item);
            });
        }
        
        // Update edit bill split options
        const editMemberSplitOptions = document.getElementById('edit-member-split-options');
        if (editMemberSplitOptions) {
            editMemberSplitOptions.innerHTML = '';
            members.forEach(member => {
                const item = document.createElement('div');
                item.className = 'member-split-item';
                item.innerHTML = `
                    <input type="checkbox" class="edit-member-split-checkbox" value="${member.id}">
                    <span class="member-name">${member.name}</span>
                    <select class="edit-split-type-select" data-member-id="${member.id}" disabled>
                        <option value="equal">均分</option>
                        <option value="fixed">指定金額</option>
                    </select>
                    <input type="number" class="edit-split-amount-input" data-member-id="${member.id}" 
                           step="0.01" placeholder="金額" disabled>
                `;
                editMemberSplitOptions.appendChild(item);
            });
        }
        
        // Add event listeners for split options
        setupSplitOptionListeners();
    }
    
    function setupSplitOptionListeners() {
        // Add bill split mode radio buttons
        document.querySelectorAll('input[name="split-mode"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const customSection = document.getElementById('custom-split-section');
                if (this.value === 'custom') {
                    customSection.style.display = 'block';
                } else {
                    customSection.style.display = 'none';
                    // Reset all checkboxes
                    document.querySelectorAll('.member-split-checkbox').forEach(cb => {
                        cb.checked = false;
                        updateSplitItemState(cb);
                    });
                }
            });
        });
        
        // Edit bill split mode radio buttons
        document.querySelectorAll('input[name="edit-split-mode"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const customSection = document.getElementById('edit-custom-split-section');
                if (this.value === 'custom') {
                    customSection.style.display = 'block';
                } else {
                    customSection.style.display = 'none';
                    // Reset all checkboxes
                    document.querySelectorAll('.edit-member-split-checkbox').forEach(cb => {
                        cb.checked = false;
                        updateEditSplitItemState(cb);
                    });
                }
            });
        });
        
        // Add bill member checkboxes
        document.querySelectorAll('.member-split-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateSplitItemState(this);
            });
        });
        
        // Edit bill member checkboxes
        document.querySelectorAll('.edit-member-split-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateEditSplitItemState(this);
            });
        });
        
        // Add bill split type selects
        document.querySelectorAll('.split-type-select').forEach(select => {
            select.addEventListener('change', function() {
                const memberId = this.getAttribute('data-member-id');
                const amountInput = document.querySelector(`.split-amount-input[data-member-id="${memberId}"]`);
                
                if (this.value === 'fixed') {
                    amountInput.disabled = false;
                    amountInput.required = true;
                } else {
                    amountInput.disabled = true;
                    amountInput.required = false;
                    amountInput.value = '';
                }
            });
        });
        
        // Edit bill split type selects
        document.querySelectorAll('.edit-split-type-select').forEach(select => {
            select.addEventListener('change', function() {
                const memberId = this.getAttribute('data-member-id');
                const amountInput = document.querySelector(`.edit-split-amount-input[data-member-id="${memberId}"]`);
                
                if (this.value === 'fixed') {
                    amountInput.disabled = false;
                    amountInput.required = true;
                } else {
                    amountInput.disabled = true;
                    amountInput.required = false;
                    amountInput.value = '';
                }
            });
        });
    }
    
    function updateSplitItemState(checkbox) {
        const memberItem = checkbox.closest('.member-split-item');
        const memberId = checkbox.value;
        const typeSelect = memberItem.querySelector('.split-type-select');
        const amountInput = memberItem.querySelector('.split-amount-input');
        
        if (checkbox.checked) {
            memberItem.classList.add('enabled');
            typeSelect.disabled = false;
            // Trigger change event to update amount input state
            typeSelect.dispatchEvent(new Event('change'));
        } else {
            memberItem.classList.remove('enabled');
            typeSelect.disabled = true;
            amountInput.disabled = true;
            amountInput.value = '';
        }
    }
    
    function updateEditSplitItemState(checkbox) {
        const memberItem = checkbox.closest('.member-split-item');
        const memberId = checkbox.value;
        const typeSelect = memberItem.querySelector('.edit-split-type-select');
        const amountInput = memberItem.querySelector('.edit-split-amount-input');
        
        if (checkbox.checked) {
            memberItem.classList.add('enabled');
            typeSelect.disabled = false;
            // Trigger change event to update amount input state
            typeSelect.dispatchEvent(new Event('change'));
        } else {
            memberItem.classList.remove('enabled');
            typeSelect.disabled = true;
            amountInput.disabled = true;
            amountInput.value = '';
        }
    }
    
    function updateMemberCheckboxState() {
        const splitAllCheckbox = document.getElementById('split-all');
        const memberCheckboxes = document.querySelectorAll('.member-checkbox');
        const editSplitAllCheckbox = document.getElementById('edit-split-all');
        const editMemberCheckboxes = document.querySelectorAll('#edit-member-checkboxes .member-checkbox');
        
        function setupCheckboxLogic(splitAll, memberBoxes) {
            if (!splitAll) return;
            
            splitAll.addEventListener('change', function() {
                memberBoxes.forEach(checkbox => {
                    checkbox.disabled = this.checked;
                    if (this.checked) {
                        checkbox.checked = false;
                    }
                });
            });
            
            memberBoxes.forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        splitAll.checked = false;
                    }
                });
            });
        }
        
        setupCheckboxLogic(splitAllCheckbox, memberCheckboxes);
        setupCheckboxLogic(editSplitAllCheckbox, editMemberCheckboxes);
    }
    
    function loadBills() {
        const searchValue = document.getElementById('search-input').value;
        const categoryValue = document.getElementById('category-filter').value;
        const payerValue = document.getElementById('payer-filter').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        let url = window.apiUrls.groupBills + '?';
        if (searchValue) url += `search=${encodeURIComponent(searchValue)}&`;
        if (categoryValue) url += `category=${categoryValue}&`;
        if (payerValue) url += `payer=${payerValue}&`;
        if (startDate) url += `start_date=${startDate}&`;
        if (endDate) url += `end_date=${endDate}&`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                bills = data;
                renderBills();
                calculateSplit();
            });
    }
    
    function renderBills() {
        const billsList = document.getElementById('bills-list');
        billsList.innerHTML = '';
        
        if (bills.length === 0) {
            billsList.innerHTML = '<p>沒有找到符合條件的帳單</p>';
            return;
        }
        
        bills.forEach(bill => {
            const billItem = document.createElement('div');
            billItem.className = 'bill-item';
            billItem.innerHTML = `
                <h4>${bill.name}</h4>
                <div class="bill-details">
                    <span><strong>付款人:</strong> ${bill.payer_name}</span>
                    <span><strong>金額:</strong> ${bill.amount} ${bill.currency_code}</span>
                    <span><strong>類別:</strong> ${bill.category_name}</span>
                    <span><strong>幫誰付款:</strong> ${bill.split_members.join(', ')}</span>
                    <span><strong>日期:</strong> ${bill.bill_date}</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary edit-bill-btn" data-bill-id="${bill.id}">編輯</button>
                    <button class="btn btn-small btn-danger delete-bill-btn" data-bill-id="${bill.id}">刪除</button>
                </div>
            `;
            billsList.appendChild(billItem);
        });
        
        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-bill-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const billId = this.getAttribute('data-bill-id');
                editBill(billId);
            });
        });
        
        document.querySelectorAll('.delete-bill-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const billId = this.getAttribute('data-bill-id');
                const bill = bills.find(b => b.id == billId);
                showDeleteConfirm('帳單', bill.name, () => deleteBill(billId));
            });
        });
    }
    
    function calculateSplit() {
        fetch(window.apiUrls.groupSplit)
            .then(response => response.json())
            .then(data => {
                const splitResult = document.getElementById('split-result');
                splitResult.innerHTML = '';
                
                if (data.length === 0) {
                    splitResult.innerHTML = '<p>目前沒有需要分帳的項目，或是大家都平分了！</p>';
                    return;
                }
                
                data.forEach(settlement => {
                    const item = document.createElement('div');
                    item.className = 'settlement-item';
                    item.innerHTML = `
                        <strong>${settlement.from}</strong> 需要給 <strong>${settlement.to}</strong> 
                        <strong>NT$ ${settlement.amount}</strong>
                    `;
                    splitResult.appendChild(item);
                });
            });
    }
    
    // Add bill form submission
    addBillForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const splitMode = document.querySelector('input[name="split-mode"]:checked').value;
        let splitData = [];
        
        if (splitMode === 'custom') {
            const checkedMembers = document.querySelectorAll('.member-split-checkbox:checked');
            
            if (checkedMembers.length === 0) {
                alert('請至少選擇一個成員進行分帳');
                return;
            }
            
            let totalFixedAmount = 0;
            let fixedCount = 0;
            let equalCount = 0;
            const billAmount = parseFloat(document.getElementById('amount').value);
            
            // First pass: collect data and count split types
            for (const checkbox of checkedMembers) {
                const memberId = checkbox.value;
                const typeSelect = document.querySelector(`.split-type-select[data-member-id="${memberId}"]`);
                const amountInput = document.querySelector(`.split-amount-input[data-member-id="${memberId}"]`);
                
                const splitInfo = {
                    member_id: parseInt(memberId),
                    share_type: typeSelect.value
                };
                
                if (typeSelect.value === 'fixed') {
                    const amount = parseFloat(amountInput.value);
                    if (!amount || amount <= 0) {
                        alert('請輸入有效的分帳金額');
                        return;
                    }
                    splitInfo.amount = amount;
                    totalFixedAmount += amount;
                    fixedCount++;
                } else {
                    equalCount++;
                }
                
                splitData.push(splitInfo);
            }
            
            // New validation: no mixing allowed
            if (fixedCount > 0 && equalCount > 0) {
                alert('不能混用指定金額和均分，請選擇其中一種方式');
                return;
            }
            
            // If all fixed amounts, they must sum exactly to bill amount
            if (fixedCount > 0 && equalCount === 0) {
                if (Math.abs(totalFixedAmount - billAmount) > 0.01) {
                    alert(`指定金額總計 ${totalFixedAmount} 必須等於帳單金額 ${billAmount}`);
                    return;
                }
            }
        }
        
        const formData = {
            name: document.getElementById('bill-name').value,
            amount: document.getElementById('amount').value,
            payer_id: document.getElementById('payer-select').value,
            category_id: document.getElementById('category-select').value,
            currency_id: document.getElementById('currency-select').value,
            bill_date: document.getElementById('bill-date').value,
            split_data: splitData
        };
        
        fetch(window.apiUrls.groupBills, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addBillForm.reset();
                // Reset split mode to "all"
                document.querySelector('input[name="split-mode"][value="all"]').checked = true;
                document.getElementById('custom-split-section').style.display = 'none';
                
                // Reset all split checkboxes
                document.querySelectorAll('.member-split-checkbox').forEach(cb => {
                    cb.checked = false;
                    updateSplitItemState(cb);
                });
                
                loadBills();
                alert('帳單新增成功！');
            }
        })
        .catch(error => {
            alert('新增帳單時發生錯誤');
            console.error('Error:', error);
        });
    });
    
    // Filter event listeners
    document.getElementById('search-input').addEventListener('input', loadBills);
    document.getElementById('category-filter').addEventListener('change', loadBills);
    document.getElementById('payer-filter').addEventListener('change', loadBills);
    document.getElementById('start-date').addEventListener('change', loadBills);
    document.getElementById('end-date').addEventListener('change', loadBills);
    
    // Clear date filter button
    document.getElementById('clear-date-filter').addEventListener('click', function() {
        document.getElementById('start-date').value = '';
        document.getElementById('end-date').value = '';
        loadBills();
    });
    
    // Settings data loading and rendering
    function loadSettingsData() {
        renderMembers();
        renderCategories();
        renderCurrencies();
    }
    
    function renderMembers() {
        const membersList = document.getElementById('members-list');
        membersList.innerHTML = '';
        members.forEach(member => {
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <span>${member.name}</span>
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary edit-member-btn" data-id="${member.id}" data-name="${member.name}">編輯</button>
                    <button class="btn btn-small btn-danger delete-member-btn" data-id="${member.id}" data-name="${member.name}">刪除</button>
                </div>
            `;
            membersList.appendChild(item);
        });
        
        // Add event listeners
        document.querySelectorAll('.edit-member-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                showEditModal('成員', this.getAttribute('data-id'), this.getAttribute('data-name'), 'member');
            });
        });
        
        document.querySelectorAll('.delete-member-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const name = this.getAttribute('data-name');
                showDeleteConfirm('成員', name, () => deleteMember(id));
            });
        });
    }
    
    function renderCategories() {
        const categoriesList = document.getElementById('categories-list');
        categoriesList.innerHTML = '';
        categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <span>${category.name}</span>
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary edit-category-btn" data-id="${category.id}" data-name="${category.name}">編輯</button>
                    <button class="btn btn-small btn-danger delete-category-btn" data-id="${category.id}" data-name="${category.name}">刪除</button>
                </div>
            `;
            categoriesList.appendChild(item);
        });
        
        // Add event listeners
        document.querySelectorAll('.edit-category-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                showEditModal('類別', this.getAttribute('data-id'), this.getAttribute('data-name'), 'category');
            });
        });
        
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const name = this.getAttribute('data-name');
                showDeleteConfirm('類別', name, () => deleteCategory(id));
            });
        });
    }
    
    function renderCurrencies() {
        const currenciesList = document.getElementById('currencies-list');
        currenciesList.innerHTML = '';
        currencies.forEach(currency => {
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <span>${currency.code} (${currency.name}) - 匯率: ${currency.rate_to_twd}</span>
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary edit-currency-btn" data-id="${currency.id}" data-code="${currency.code}" data-name="${currency.name}" data-rate="${currency.rate_to_twd}">編輯</button>
                    <button class="btn btn-small btn-danger delete-currency-btn" data-id="${currency.id}" data-name="${currency.name}">刪除</button>
                </div>
            `;
            currenciesList.appendChild(item);
        });
        
        // Add event listeners
        document.querySelectorAll('.edit-currency-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                showEditCurrencyModal(
                    this.getAttribute('data-id'),
                    this.getAttribute('data-code'),
                    this.getAttribute('data-name'),
                    this.getAttribute('data-rate')
                );
            });
        });
        
        document.querySelectorAll('.delete-currency-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const name = this.getAttribute('data-name');
                showDeleteConfirm('幣別', name, () => deleteCurrency(id));
            });
        });
    }
    
    // Modal functions
    function showDeleteConfirm(type, name, callback) {
        document.getElementById('delete-message').textContent = `確定要刪除${type}「${name}」嗎？此操作無法復原。`;
        confirmDeleteModal.style.display = 'block';
        
        const confirmBtn = document.getElementById('confirm-delete-btn');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        
        // Remove previous event listeners
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        
        // Add new event listeners
        document.getElementById('confirm-delete-btn').addEventListener('click', function() {
            callback();
            confirmDeleteModal.style.display = 'none';
        });
        
        document.getElementById('cancel-delete-btn').addEventListener('click', function() {
            confirmDeleteModal.style.display = 'none';
        });
    }
    
    function showEditModal(title, id, name, type) {
        document.getElementById('edit-title').textContent = `編輯${title}`;
        document.getElementById('edit-fields').innerHTML = `
            <div class="form-group">
                <label for="edit-name">名稱</label>
                <input type="text" id="edit-name" value="${name}" required>
            </div>
        `;
        editModal.style.display = 'block';
        
        currentEditItem = { type, id };
    }
    
    function showEditCurrencyModal(id, code, name, rate) {
        document.getElementById('edit-title').textContent = '編輯幣別';
        document.getElementById('edit-fields').innerHTML = `
            <div class="form-group">
                <label for="edit-currency-code">幣別代碼</label>
                <input type="text" id="edit-currency-code" value="${code}" maxlength="3" required>
            </div>
            <div class="form-group">
                <label for="edit-currency-name">幣別名稱</label>
                <input type="text" id="edit-currency-name" value="${name}" required>
            </div>
            <div class="form-group">
                <label for="edit-currency-rate">對台幣匯率</label>
                <input type="number" id="edit-currency-rate" value="${rate}" step="0.0001" required>
            </div>
        `;
        editModal.style.display = 'block';
        
        currentEditItem = { type: 'currency', id };
    }
    
    // Edit form submission
    document.getElementById('edit-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!currentEditItem) return;
        
        let data;
        let url;
        
        if (currentEditItem.type === 'currency') {
            data = {
                code: document.getElementById('edit-currency-code').value,
                name: document.getElementById('edit-currency-name').value,
                rate_to_twd: parseFloat(document.getElementById('edit-currency-rate').value)
            };
            url = window.apiUrls.currencyBase + currentEditItem.id;
        } else {
            data = {
                name: document.getElementById('edit-name').value
            };
            if (currentEditItem.type === 'member') {
                url = window.apiUrls.memberBase + currentEditItem.id;
            } else if (currentEditItem.type === 'category') {
                url = window.apiUrls.categoryBase + currentEditItem.id;
            }
        }
        
        fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                editModal.style.display = 'none';
                loadData();
                alert('更新成功！');
            }
        })
        .catch(error => {
            alert('更新時發生錯誤');
            console.error('Error:', error);
        });
    });
    
    document.getElementById('cancel-edit-btn').addEventListener('click', function() {
        editModal.style.display = 'none';
    });
    
    // Delete functions
    function deleteMember(id) {
        fetch(window.apiUrls.memberBase + id, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadData();
                    alert('成員刪除成功！');
                } else {
                    alert(data.error || '刪除失敗');
                }
            })
            .catch(error => {
                alert('刪除時發生錯誤');
                console.error('Error:', error);
            });
    }
    
    function deleteCategory(id) {
        fetch(window.apiUrls.categoryBase + id, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadData();
                    alert('類別刪除成功！');
                } else {
                    alert(data.error || '刪除失敗');
                }
            })
            .catch(error => {
                alert('刪除時發生錯誤');
                console.error('Error:', error);
            });
    }
    
    function deleteCurrency(id) {
        fetch(window.apiUrls.currencyBase + id, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadData();
                    alert('幣別刪除成功！');
                } else {
                    alert(data.error || '刪除失敗');
                }
            })
            .catch(error => {
                alert('刪除時發生錯誤');
                console.error('Error:', error);
            });
    }
    
    function deleteBill(id) {
        fetch(window.apiUrls.billBase + id, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadBills();
                    alert('帳單刪除成功！');
                }
            });
    }
    
    // Edit bill function
    function editBill(billId) {
        const bill = bills.find(b => b.id == billId);
        if (!bill) return;
        
        // Populate form fields
        document.getElementById('edit-bill-name').value = bill.name;
        document.getElementById('edit-amount').value = bill.amount;
        document.getElementById('edit-payer-select').value = bill.payer_id;
        document.getElementById('edit-category-select').value = bill.category_id;
        document.getElementById('edit-currency-select').value = bill.currency_id;
        document.getElementById('edit-bill-date').value = bill.bill_date_input;
        
        // Check if all members are splitting or custom splits
        const hasCustomSplits = bill.split_details && bill.split_details.some(split => 
            split.share_type === 'fixed' || bill.split_details.length < members.length
        );
        
        if (hasCustomSplits) {
            // Custom split mode
            document.querySelector('input[name="edit-split-mode"][value="custom"]').checked = true;
            document.getElementById('edit-custom-split-section').style.display = 'block';
            
            // Reset all checkboxes first
            document.querySelectorAll('.edit-member-split-checkbox').forEach(cb => {
                cb.checked = false;
                updateEditSplitItemState(cb);
            });
            
            // Set up the custom split details
            bill.split_details.forEach(splitDetail => {
                const checkbox = document.querySelector(`.edit-member-split-checkbox[value="${splitDetail.member_id}"]`);
                const typeSelect = document.querySelector(`.edit-split-type-select[data-member-id="${splitDetail.member_id}"]`);
                const amountInput = document.querySelector(`.edit-split-amount-input[data-member-id="${splitDetail.member_id}"]`);
                
                if (checkbox) {
                    checkbox.checked = true;
                    updateEditSplitItemState(checkbox);
                    
                    if (typeSelect) {
                        typeSelect.value = splitDetail.share_type;
                        typeSelect.dispatchEvent(new Event('change'));
                        
                        if (splitDetail.share_type === 'fixed' && splitDetail.amount && amountInput) {
                            amountInput.value = splitDetail.amount;
                        }
                    }
                }
            });
        } else {
            // All members split mode
            document.querySelector('input[name="edit-split-mode"][value="all"]').checked = true;
            document.getElementById('edit-custom-split-section').style.display = 'none';
        }
        
        editBillModal.style.display = 'block';
        currentEditItem = { type: 'bill', id: billId };
    }
    
    // Edit bill form submission
    document.getElementById('edit-bill-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const splitMode = document.querySelector('input[name="edit-split-mode"]:checked').value;
        let splitData = [];
        
        if (splitMode === 'custom') {
            const checkedMembers = document.querySelectorAll('.edit-member-split-checkbox:checked');
            
            if (checkedMembers.length === 0) {
                alert('請至少選擇一個成員進行分帳');
                return;
            }
            
            let totalFixedAmount = 0;
            let fixedCount = 0;
            let equalCount = 0;
            const billAmount = parseFloat(document.getElementById('edit-amount').value);
            
            // First pass: collect data and count split types
            for (const checkbox of checkedMembers) {
                const memberId = checkbox.value;
                const typeSelect = document.querySelector(`.edit-split-type-select[data-member-id="${memberId}"]`);
                const amountInput = document.querySelector(`.edit-split-amount-input[data-member-id="${memberId}"]`);
                
                const splitInfo = {
                    member_id: parseInt(memberId),
                    share_type: typeSelect.value
                };
                
                if (typeSelect.value === 'fixed') {
                    const amount = parseFloat(amountInput.value);
                    if (!amount || amount <= 0) {
                        alert('請輸入有效的分帳金額');
                        return;
                    }
                    splitInfo.amount = amount;
                    totalFixedAmount += amount;
                    fixedCount++;
                } else {
                    equalCount++;
                }
                
                splitData.push(splitInfo);
            }
            
            // New validation: no mixing allowed
            if (fixedCount > 0 && equalCount > 0) {
                alert('不能混用指定金額和均分，請選擇其中一種方式');
                return;
            }
            
            // If all fixed amounts, they must sum exactly to bill amount
            if (fixedCount > 0 && equalCount === 0) {
                if (Math.abs(totalFixedAmount - billAmount) > 0.01) {
                    alert(`指定金額總計 ${totalFixedAmount} 必須等於帳單金額 ${billAmount}`);
                    return;
                }
            }
        }
        
        const formData = {
            name: document.getElementById('edit-bill-name').value,
            amount: document.getElementById('edit-amount').value,
            payer_id: document.getElementById('edit-payer-select').value,
            category_id: document.getElementById('edit-category-select').value,
            currency_id: document.getElementById('edit-currency-select').value,
            bill_date: document.getElementById('edit-bill-date').value,
            split_data: splitData
        };
        
        fetch(window.apiUrls.billBase + currentEditItem.id, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                editBillModal.style.display = 'none';
                loadBills();
                alert('帳單更新成功！');
            }
        })
        .catch(error => {
            alert('更新帳單時發生錯誤');
            console.error('Error:', error);
        });
    });
    
    document.getElementById('cancel-edit-bill-btn').addEventListener('click', function() {
        editBillModal.style.display = 'none';
    });
    
    // Add item functions (existing functionality)
    document.getElementById('add-member-btn').addEventListener('click', function() {
        const name = document.getElementById('new-member-name').value.trim();
        if (!name) return;
        
        fetch(window.apiUrls.groupMembers, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const newMember = { id: data.id, name: name };
                members.push(newMember);
                document.getElementById('new-member-name').value = '';
                renderMembers();
                updateSelects();
            }
        });
    });
    
    document.getElementById('add-category-btn').addEventListener('click', function() {
        const name = document.getElementById('new-category-name').value.trim();
        if (!name) return;
        
        fetch(window.apiUrls.groupCategories, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const newCategory = { id: data.id, name: name };
                categories.push(newCategory);
                document.getElementById('new-category-name').value = '';
                renderCategories();
                updateSelects();
            }
        });
    });
    
    document.getElementById('add-currency-btn').addEventListener('click', function() {
        const code = document.getElementById('new-currency-code').value.trim().toUpperCase();
        const name = document.getElementById('new-currency-name').value.trim();
        const rate = parseFloat(document.getElementById('new-currency-rate').value);
        
        if (!code || !name || !rate) return;
        
        fetch(window.apiUrls.groupCurrencies, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, name, rate_to_twd: rate })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const newCurrency = { 
                    id: data.id, 
                    code: code, 
                    name: name, 
                    rate_to_twd: rate 
                };
                currencies.push(newCurrency);
                document.getElementById('new-currency-code').value = '';
                document.getElementById('new-currency-name').value = '';
                document.getElementById('new-currency-rate').value = '';
                renderCurrencies();
                updateSelects();
            }
        });
    });
    
    // Group management
    document.getElementById('save-group-name').addEventListener('click', function() {
        const newName = document.getElementById('group-name-edit').value.trim();
        const newPin = document.getElementById('group-pin-edit').value.trim();
        
        if (!newName) {
            alert('請輸入群組名稱');
            return;
        }
        
        if (!newPin || !/^\d{6}$/.test(newPin)) {
            alert('PIN碼必須為6位數字');
            return;
        }
        
        fetch(window.apiUrls.groupUpdate, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, pin_code: newPin })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('群組資訊更新成功！');
                location.reload();
            } else {
                alert(data.error || '更新失敗');
            }
        })
        .catch(error => {
            alert('更新時發生錯誤');
            console.error('Error:', error);
        });
    });
    
    document.getElementById('delete-group-btn').addEventListener('click', function() {
        showDeleteConfirm('群組', document.getElementById('group-name-edit').value, function() {
            fetch(window.apiUrls.groupDelete, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('群組刪除成功！');
                        window.location.href = '/billgets/';
                    } else {
                        alert(data.error || '群組刪除失敗');
                    }
                })
                .catch(error => {
                    alert('刪除群組時發生錯誤');
                    console.error('Error:', error);
                });
        });
    });
    
    // Member details functionality
    document.getElementById('member-details-select').addEventListener('change', function() {
        const memberId = this.value;
        if (!memberId) {
            document.getElementById('member-details-result').innerHTML = '';
            return;
        }
        
        fetch(window.apiUrls.memberDetails + memberId)
            .then(response => response.json())
            .then(data => {
                const resultDiv = document.getElementById('member-details-result');
                resultDiv.innerHTML = `
                    <h3>${data.member_name} 的帳務明細</h3>
                    
                    <div class="detail-section total-expense">
                        <h4>總支出</h4>
                        <div class="total-expense-amount">
                            <strong style="font-size: 1.2em; color: #e74c3c;">NT$ ${data.total_expense}</strong>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>已付款項目</h4>
                        ${data.paid_bills.length === 0 ? '<p>無付款記錄</p>' : 
                            data.paid_bills.map(bill => `
                                <div class="detail-item paid">
                                    <strong>${bill.name}</strong><br>
                                    金額: ${bill.amount} ${bill.currency_code}<br>
                                    類別: ${bill.category_name}<br>
                                    幫誰付款: ${bill.split_members.join(', ')}<br>
                                    日期: ${bill.bill_date}
                                </div>
                            `).join('')
                        }
                    </div>
                    
                    <div class="detail-section">
                        <h4>參與分帳項目</h4>
                        ${data.split_bills.length === 0 ? '<p>無分帳記錄</p>' : 
                            data.split_bills.map(bill => `
                                <div class="detail-item split">
                                    <strong>${bill.name}</strong><br>
                                    付款人: ${bill.payer_name}<br>
                                    分攤金額: ${bill.amount.toFixed(2)} ${bill.currency_code} (總金額: ${bill.total_amount} ${bill.currency_code})<br>
                                    類別: ${bill.category_name}<br>
                                    日期: ${bill.bill_date}
                                </div>
                            `).join('')
                        }
                    </div>
                `;
            });
    });
    
    loadData();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bill-date').value = today;
});