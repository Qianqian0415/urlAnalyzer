const express = require('express');  //����express���
const fs = require('fs');     //require��������ģ��fs
const jsdom = require('jsdom');
const bodyParser = require('body-parser');

const elemTypes = JSON.parse(fs.readFileSync('./elemTypes.json', 'utf8')); //������fs�����ȡ�ļ�
console.log(elemTypes);
const getTextSelectors = require('./getTextSelectors');  //require�����Զ���ģ��

const app = express();      //ʵ����Express
app.use(bodyParser.json());               //����Express�ṩ��һЩ�м��
app.use(bodyParser.urlencoded({ extended: true })); 
app.use('/static', express.static('public'));

app.post('/fetchUrl', (req, res) => {    //req:Request�����󣩷�����res:Response����Ӧ������
	var url = req.body.url;     //req.body��Ӧ�����������������bodyParser()�м���ṩ
	var text = req.body.text;

	fetchUrl(res, url, text);    //
});

//�Ի�ȡ����ַ���н���
function fetchUrl(resp, url, text){
	var selectors = getTextSelectors(text);
	jsdom.env({
         features: {
         FetchExternalResources: ["script"],
         ProcessExternalResources: ["script"],
         SkipExternalResources: false
    },
	    url: url,
	    done: (err, window) => {
            var document = window.document;
            console.log("����ɹ������ڽ���...");
            // console.log(document.body.innerHTML);
            var acc = 1;

            var res = elemTypes.reduce((memo, type) => {
                var elems = document.querySelectorAll(type.selector);

                var typeElems = Array.prototype.map.call(elems, function(elem) {
                	var matcher = matchElem(elem, selectors);
                    return {
                    	index: acc++, 
                    	elemType: type.type, 
                    	html: elem.outerHTML, 
                    	xpath: getXPath(elem),
                    	matchers: matcher
                    };
                });

                return memo.concat(typeElems);
            }, []);

            var coverLength = res.filter(resItem => {
            	return resItem.matchers !== '';
            }).length;
            var coverRate = (coverLength / res.length * 100 + '').substr(0, 4) + '%';

            resp.send({    //����һ����Ӧ
            	coverRate: coverRate,
            	res: res
            });
	    }
	});
}

// ���ڵ��Ƿ�match selector
function matchElem(elem, selectors){
	const document = elem.ownerDocument;
	const window = document.defaultView;
	const matchers = selectors.reduce((memo, sel) => {
		if(sel.type === 'css' && elem.matches(sel.selector)){
			return [...memo, sel.matcher];
		}
		if(sel.type === 'linkText' && elem.textContent.trim() === sel.selector){
			return [...memo, sel.matcher];
		}
		if(sel.type === 'partialLinkText' && elem.innerHTML.search(sel.selector) >= 0){
			return [...memo, sel.matcher];
		}
		if(sel.type === 'xpath' && 
				document.evaluate(sel.selector, elem, null, window.XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue === elem){
			return [...memo, sel.matcher];
		}

		return memo;
	}, []);

	return matchers.join(',')
}

//��ȡ��Ԫ�ص�xpath
function getXPath(element) {
    var document = element.ownerDocument;
    if (element.id !== '')
        return '//*[@id="' + element.id + '"]';
    if (element === document.body)
        return '/html/body';

    var ix = 0;
    var siblings = element.parentNode.childNodes;

    for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];

        var sameTypeSiblingLength = Array.prototype.filter.call(siblings, function(sitem){
        	return sitem.nodeType === 1 && sibling.tagName === sitem.tagName;
    	}).length;

        if (sibling === element){
          var suffix = sameTypeSiblingLength === 1 ? '' : '[' + (ix + 1) + ']';
          return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() +  suffix;
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
            ix++;
    }
}


app.listen(3000, function () {
  console.log('Analyzing app listening on port 3000, visit localhost:3000/static/index.html!');
});

