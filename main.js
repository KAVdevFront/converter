const elemUSD = document.querySelector('[data-value="USD"]')
const elemEUR = document.querySelector('[data-value="EUR"]')
const elemGBP = document.querySelector('[data-value="GBP"]')
const elemInput = document.querySelector('#input')
const elemResult = document.querySelector('#result')
const elemSelect = document.querySelector('#select')
const elemInputStart = document.querySelector('#date-start')
const elemInputEnd = document.querySelector('#date-end')
const elemSelectGraph = document.querySelector('#select3')



const monthName={
    1:'Jan',
    2:'Feb',
    3:'Mar',
    4:'Apr',
    5:'May',
    6:'Jun',
    7:'Jul',
    8:'Aug',
    9:'Sep',
    10:'Oct',
    11:'Nav',
    12:'Dec',
}

const courses = {}

async function fetchCourses (){
    const response = await fetch('https://www.nbrb.by/api/exrates/rates?periodicity=0')
    const  data = await response.json()
    const result = await data
    courses.USD = result[7]
    courses.EUR = result[9]
    courses.GBP = result[27]
    elemUSD.textContent = courses.USD.Cur_OfficialRate.toFixed(2)
    elemEUR.textContent = courses.EUR.Cur_OfficialRate.toFixed(2)
    elemGBP.textContent = courses.GBP.Cur_OfficialRate.toFixed(2)

}
fetchCourses()




elemInput.oninput = calculateValue;
elemSelect.oninput = calculateValue;


function calculateValue(){
    elemResult.value = (elemInput.value / courses[elemSelect.value].Cur_OfficialRate).toFixed(2)
}
//График ==============
//Функция для создания массива координат для графика
function dataDates(res){
    let coordinates = []
    let date = []
    for (let i = 0;i<res.length;i++){
        let elDate = res.at(i).Date.split('T').at(0)
        let elValue = res.at(i).Cur_OfficialRate
        coordinates.push([i,elValue])
        date.push(elDate)

    }
    return {date,coordinates}
}
//

//Константы для самого canvas
const WIDTH = 600
const HEIGHT = 300
const DPI_WIDTH = WIDTH * 2
const DPI_HEIGHT = HEIGHT * 2
const ROWS_COUNT = 5
const PADDING = 40
const VIEW_HEIGHT = DPI_HEIGHT - PADDING * 2
const step = VIEW_HEIGHT / ROWS_COUNT
const CIRCLE_RADIUS = 8

//



//асинхронная функция     запрос на сервер, затем вызов функции выше, затем построение графика по данным от функции выше + tooltip
async function fetchInterval(){
    if (elemInputEnd.value && elemInputStart.value){
        const respose = await fetch(`https://www.nbrb.by/API/ExRates/Rates/Dynamics/${courses[elemSelectGraph.value].Cur_ID}?startDate=${elemInputStart.value}&endDate=${elemInputEnd.value}`)
        const result = await respose.json()


        const {date,coordinates} =  dataDates(result)
        drawGraphic(document.getElementById('canvas'), coordinates,date)
    }


}
//



//по изменению полей у нод вызов асинхронной финкции
elemInputStart.oninput = fetchInterval
elemInputEnd.oninput = fetchInterval
elemSelectGraph.oninput = fetchInterval
//=====








function drawGraphic(canvas,coords,textOx){
    let raf
    const ctx = canvas.getContext('2d')
    const tip = tooltip(document.querySelector('[data-el="tooltip"]'))
    const [yMin,yMax] = computeBoundaries(coords)
    const textStep = ((yMax===yMin)?yMax:yMax-yMin) / ROWS_COUNT
    canvas.style.width = WIDTH + 'px'
    canvas.style.height = HEIGHT + 'px'
    canvas.width = DPI_WIDTH
    canvas.height = DPI_HEIGHT
    const proxy = new Proxy({},{
        set(...args){
            const result = Reflect.set(...args)
            return result
        }
    })

    function mousemove({clientX,clientY}){
        const {left,top} = canvas.getBoundingClientRect()
        raf = requestAnimationFrame(paint)
        proxy.mouse = {
            x:(clientX - left) * 2,
            tooltip:{
                left: clientX - left,
                top:clientY - top,
            }
        }
    }
    function mouseleave(){
        proxy.mouse = null
    }
    canvas.addEventListener('mousemove',mousemove)
    canvas.addEventListener('mouseleave', mouseleave)

    function clear(){
        ctx.clearRect(0,0,DPI_WIDTH,DPI_HEIGHT)
    }


    function paint (){
        clear()
        ctx.beginPath()
        ctx.strokeStyle = '#bbb'
        ctx.font = 'normal 20px Helvetica, sans-serif'
        for(let i = 1;i<=ROWS_COUNT;i++){
            const y = step * i
            const text = yMax - textStep * i
            ctx.fillText(text.toFixed(2).toString(),5, y+PADDING-10 )
            ctx.moveTo(0,y+PADDING )
            ctx.lineTo(DPI_WIDTH,y + PADDING)
        }
        ctx.stroke()
        ctx.closePath()

        // подписи по Оси X
        ctx.beginPath()
        ctx.strokeStyle = '#bbb'
        ctx.font = 'normal 20px Helvetica, sans-serif'

        for(let i = 0;i<textOx.length;i++){
            const countX = (textOx.length >200)?36:(textOx.length <=200 && textOx.length >= 100)? 24:12
            const dateMonth = +textOx.at(i).toString().split('-').at(1)
            const dateDay = +textOx.at(i).toString().split('-').at(2)
            const x = i*(DPI_WIDTH-PADDING)/textOx.length
            ctx.fillText((i%countX ===0  || textOx.length<countX)?(monthName[dateMonth] + ' ' + dateDay):'',x,DPI_HEIGHT-10)

            if (isOver(proxy.mouse,x,coords.length)){
                ctx.save()
                ctx.moveTo(x, PADDING / 2)
                ctx.lineTo(x, DPI_HEIGHT - PADDING)
                ctx.restore()


                tip.show(proxy.mouse.tooltip,{
                    title:coords.at(i-1).at(1),
                    date:textOx.at(i-1).split('-').reverse().join(':'),
                })
            }
        }
        ctx.stroke()
        ctx.closePath()

        //======
        //сам график
        ctx.beginPath()
        ctx.strokeStyle = 'green'
        ctx.lineWidth = 3
        for (const [x,y] of coords){
            ctx.lineTo(x * DPI_WIDTH / coords.length,(yMax===yMin)?PADDING:VIEW_HEIGHT-((y-yMin)/(yMax-yMin)*VIEW_HEIGHT-PADDING))
        }
        ctx.stroke()
        ctx.closePath()
        for (const [x,y] of coords){
            if (isOver(proxy.mouse,x * DPI_WIDTH / coords.length,coords.length)){
                circle(ctx,[x * DPI_WIDTH / coords.length,(yMax===yMin)?PADDING:VIEW_HEIGHT-((y-yMin)/(yMax-yMin)*VIEW_HEIGHT-PADDING)],'red')

                break
            }
        }
    }
    // ========
    paint()
    return {
        destroy (){
            canvas.cancelAnimationFrame(raf)
            canvas.removeEventListener('mousemove',mousemove)
            canvas.removeEventListener('mouseleave',mouseleave)
        },
    }
}

const tooltipTemplate = ({title,date})=>`
<div class="tooltip-value">Курс:${title}</div>
<div class="tooltip-date">Дата:${date}</div>
`


function computeBoundaries (data){
    let min
    let max
    for (const [,y] of data){
        if(typeof min !== 'number') min = y
        if(typeof max !== 'number') max = y
        if (min > y ) min = y
        if (max <y) max = y
     }
    return [min,max]
}
function isOver (mouse,x,length){
    if(!mouse){
        return false
    }
    const width = DPI_WIDTH/length
    return Math.abs(x - mouse.x) < width/2


}
function circle (ctx,[x,y],color){
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.arc(x,y,CIRCLE_RADIUS,1,Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.closePath()
}
function tooltip(el){
    const clear = ()=> (el.innerHTML = '')
    return{
        show({left,top},data){
            const {height,width} = el.getBoundingClientRect()
            clear()
            css(el, {
                display: 'block',
                top:(top-height) + 'px',
                left:(left+width/2)  + 'px',

            })
            el.insertAdjacentHTML('afterbegin', tooltipTemplate(data))
        },
        hide(){
            css(el, {display:'none'})
        }
    }


}
function css (el, styles = {}){
    Object.assign(el.style, styles)
}



