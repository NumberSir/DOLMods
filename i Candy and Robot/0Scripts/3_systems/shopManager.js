
const iShop = {
	shelfdata : {
		daiso_snack: function(){
			const data = Items.searchType('foods')
			const list = data.filter( item => item.tags.has('snack', 'candy') && !item.tags.has('seasonal', 'mealbox', 'premade') && !item.location )
			//随机抽取8个
			const result = []
			for(let i = 0; i < 8; i++){
				if(list.length == 0) break

				let item = list.randompop()
				result.push(item)
			}
			return result
		},
		daiso_drink: function(){
			const data = Items.searchType('drinks')
			const list = data.filter( item => item.tags.has('coffee', 'soda', 'energy', 'tea') && !item.tags.includes('seasonal', 'premade') && !item.location )
			//随机抽取8个
			const result = []
			result.push(Items.get('mineralwater'))

			for(let i = 0; i < 8; i++){
				if(list.length == 0) break

				let item = list.randompop()
				result.push(item)
			}
			return result
		},
		daiso_foods: function(){
			const data = Items.searchType('foods')
			const list = data.filter( item => item.tags.has('mealbox', 'premade', 'bread') && !item.location && ( !item.tags.has('seasonal') || item.tags.has('seasonal', Time.season) == 2 ))

			//随机抽取6个
			const result = []
			result.push(Items.get('sandwich'))
			for(let i = 0; i < 6; i++){
				if(list.length == 0) break

				let item = list.randompop()
				result.push(item)
			}
			return result
		},
		daiso_sundry: function(){
			const data = Items.searchType('misc')
			data.push(...Items.searchType('consumables'))
			const list = data.filter( item => item.tags.has('sundry'))

			const result = []
			for(let i = 0; i < 6; i++){
				if(list.length == 0) break

				let item = list.randompop()
				result.push(item)
			}
			return result
		}
	},
	initShelf : function(shelf){
		V.iShop[shelf] = {
			stocks : [],
			discount : 0,
			state : 'none'
		}
	},
	getshelf : function(shelf){
		const shelfStats = V.iShop[shelf]
		const current = shelfStats?.stocks ?? []

		let itemlist = []
		let shopitems = []
		if(current.length == 0 || shelfStats.state.has('none', 'clear') ){
			itemlist = this.shelfdata[shelf]()
			itemlist.forEach((item)=>{
				let diff = undefined

				if(item.diff){
					//如果有差分，随机设置差分。
					const diffdata = Object.keys(item.diff)
					diff = diffdata.randompop()
				}

				shopitems.push(new shopItem(item.id,item.price, item.num, diff))
			})
            V.iShop[shelf].stocks = shopitems
            V.iShop[shelf].state = 'stocked'
		}
		else{
			shopitems = current
		}

		return shopitems

	},

	printShelf : function(shelf){
		const shopitems = this.getshelf(shelf)
		let output = ''
        if(V.iShop[shelf].discount > 0 ){
            output += `<div class='shopdiscount'>${(V.iShop[shelf].discount * 100)}% off</div>`
        }

        output += '<div class="shopshelf">'

		for(let i=0; i < shopitems.length; i++){
			const item = shopitems[i]
			const data = Items.get(item.id)
			const img = iUtil.itemImageResolve(item, data)
			const unit1 = batchUnitTxt(data.tags, item.stock)
			const unit2 = subUnitTxt(data.tags, item.count)
            const price = item.price/100 * ( 1 - V.iShop[shelf].discount)


			let html = [
				`<div class='shopitembox' onclick='iShop.select("${shelf}", ${i})'>`,
				`	<div class='shopitemname'>${lanSwitch(data.name)}</div>`,
				`	<div class='shopitemiconframe'>`,
				`		<div class='shopitemicon'>`,
				`			<img src='${img}'>`,
				`		</div>`,
				`	</div>`,
				`	<div class='itemprice'>`,
				`		<span class='golden bold'>${price.toFixed(2)}£</span>/${unit1 || unit2}`,
				`	</div>`,
				`   <div class='itemstock'>${item.stock}${unit1 || unit2} left</div>`,
				`</div>`,
			]

			output += html.join('\n')
		}

		return output + '</div>'
	},

	tabSwitch : function(shelf){
		const html = this.printShelf(shelf)
		V.shoptabIndex = shelf

		//变更div id:shopbanner的class
		//const banner = document.getElementById('shopbanner')
		//banner.className = `${shelf}_banner`

		const count = Math.clamp( Math.floor((window.innerWidth * 0.7) / 200), 1, 4)
		const img = `<img src="img/misc/${shelf}_banner.png">`.repeat(count)

		new Wikifier(null, `<<replace "#shopshelf">>${html}<</replace>>`)
		new Wikifier(null, `<<replace "#shopbanner">>${img}<</replace>>`)
	},

	printCart : function(item){
		const data = Items.get(item.id)
		const img = iUtil.itemImageResolve(item, data)
		const name = lanSwitch(data.name)
		const info = lanSwitch(data.info)
        console.log('print cart item:', item, item.stack, data.tags, data.num )
		const unit = itemUnit(data.tags, item.stack, data.num)
        const shelf = item.index[0]
        const price = item.price/100 * ( 1 - V.iShop[shelf].discount)

		const html = `
		<div id="shopcart">
			<div id="shopcart-left">
				<div id="shopcart-itemname">
					${name}
				</div>
				<div id="shopcart-iteminfo">
					<div id="shopcart-icon">
						<div class="shopcart-icon">
							<img src="${img}">
						</div>
					</div>
					<div class="shopcart-info">
						${info}
					</div>
				</div>
			</div>

			<div id="shopcart-right">
				<div class="cart-itemcount">x${unit}</div>
				<div class="cart-itemprice">
					<span class="cart-price">total: ${price.toFixed(2)}£</span>
					<<button ${lanSwitch('buy', '购买')}>><<run iShop.buyItem()>><</button>>
				</div>
			</div>
		</div>`

		return html
	},

	select : function(shelf, index){
		const item = V.iShop[shelf].stocks[index]
		if(item.stock <= 0){
			new Wikifier(null, `<<replace #notice transition>><span class="red">${lanSwitch('Out of stock.', '没有货了。')}<br></span><</replace>>`)
			return
		}
        
		if( V.iShop.selected?.id !== item.id){
			V.iShop.selected = clone(item)

			V.iShop.selected.stack = 1
			V.iShop.selected.index = [shelf, index]

			delete V.iShop.selected.stock
			delete V.iShop.selected.count

		}
		else {
			V.iShop.selected.stack += 1
		}

		const html = this.printCart(V.iShop.selected)		
		new Wikifier(null, `<<replace #shopcartbox>>${html}<</replace>>`)
	},

	notice : function(message, color){
		new Wikifier(null, `<<replace #notice transition>><span class="${color}">${lanSwitch(message)}<br></span><</replace>>`)
	},

    clearCart: function(){
        delete V.iShop.selected
    },

	buyItem : function(){
		const selectItem = V.iShop.selected
		const [shelf, index] = selectItem.index
		const shopItem = V.iShop[shelf].stocks[index]

		const data = Items.get(selectItem.id)
		const getNum = data.num * selectItem.stack
		const totalPrice = shopItem.price * selectItem.stack * ( 1 - V.iShop[shelf].discount)

		let message = ''

		if(V.money < totalPrice){
			message = lanSwitch('Not enough money.', '钱不够。')
			this.notice(message, 'red')
			return
		}

		if(iM.checkItemOnGet(selectItem.id, getNum) == false){
			message = lanSwitch('Not enough space.', '空间不够。')
			this.notice(message, 'red')
			return
		}

		V.money -= totalPrice
		shopItem.stock -= selectItem.stack
		shopItem.count -= selectItem.stack * data.num

		iM.getItems(selectItem.id, selectItem.stack * data.num)

		const unit1 = batchUnitTxt(data.tags, selectItem.stack)
		const unit2 = subUnitTxt(data.tags, selectItem.stack * data.num)

		message = [
			//You bought 1 bottle of mineral water for 0.5£.
			`You bought ${selectItem.stack}`
			+`${ unit1 ? ` ${unit1}` : unit2 ? `${unit2}` : ''}`
			+`${ unit1 || unit2 ? ' of ' : ''}`
			+`${data.name[0]} for ${(totalPrice/100).toFixed(2)}£.`,

			//你购买了2盒糖果，总共花费了0.5£。
			`你购买了${selectItem.stack}`
			+`${ unit1 ? ` ${unit1}` : unit2 ? `${unit2}` : ''}`
			+`${data.name[1]}`
			+`，总共花费了${(totalPrice/100).toFixed(2)}£。`,
		]

        //refresh cart and page
        this.clearCart()
        Engine.play(V.passage)

        setTimeout(()=>{
            this.notice(lanSwitch(message), 'green')
        }, Engine.minDomActionTime + 10)
		     
		
	},
}

function shopItem(id, price, num, diff){
	this.id = id
	this.uid = id
	this.stock = 50
	this.count = 50 * num
	this.price = price * R.config.shopPriceMult

	if(diff){
		this.diff = diff
		this.uid = `${id}_${diff}`
	}
}

Object.defineProperties(window, {
	iShop : { value : iShop },
	shopItem : { value : shopItem },
})