type Expr = number | string | { operator: string, left: Expr, right: Expr }
type Thunk = { tag: 'thunk', func: (...args: any[]) => any, args: any[] } | { tag: 'value', val: Expr }
declare var parser: { parse: (input: string) => Expr }

var add = function (v1: Expr, v2: Expr) {
	var result = { operator: '+', left: v1, right: v2 };
	return result;
};
var sub = function (v1: Expr, v2: Expr) {
	var result = { operator: '-', left: v1, right: v2 };
	return result;
};
var mul = function (v1: Expr, v2: Expr) {
	var result = { operator: '*', left: v1, right: v2 };
	return result;
};
var div = function (v1: Expr, v2: Expr) {
	var result = { operator: '/', left: v1, right: v2 };
	return result;
};
var exp = function (v1: Expr, v2: Expr) {
	var result = { operator: '^', left: v1, right: v2 };
	return result;
};

var compareNodes = function (a: Expr, b: Expr): boolean {
	if (typeof a === 'number' || typeof a === 'string' || typeof b === 'number' || typeof b === 'string')
		return a === b;
	if (typeof a.operator !== 'undefined' && typeof b.operator !== 'undefined')
		return compareNodes(a.operator, b.operator) && compareNodes(a.left, b.left) && compareNodes(a.right, b.right);
	throw "Unable to compare nodes!";
};


function differentiateExpression(expr: Expr): Expr {
	if (typeof expr === 'number') {
		return 0;
	}
	if (typeof expr === 'string') {
		if (expr === 'x')
			return 1;
		return expr;
	}
	var v1 = expr.left;
	var v2 = expr.right;
	switch (expr.operator) {
		case '+': {
			var a = differentiateExpression(expr.left);
			var b = differentiateExpression(expr.right);
			return add(a, b);
		}
		case '-': {
			var a = differentiateExpression(expr.left);
			var b = differentiateExpression(expr.right);
			return sub(a, b);
		}
		case '*': {
			var v1d = differentiateExpression(v1);
			var v2d = differentiateExpression(v2);
			return add(mul(v1d, v2), mul(v1, v2d));
		}
		case '^': {
			//  f ^g  ' = f ^g *(f'  g /f +  g'  ln(f ))
			// (v1^v2)' = v1^v2*(v1d*v2/v1 + v2d*ln(v1))
			var v1d = differentiateExpression(v1);
			var v2d = differentiateExpression(v2);
			var l = exp(v1, v2)
			var r = add(
				div(
					mul(v1d, v2),
					v1
				),
				mul(
					v2d,
					{
						operator: 'functionCall',
						left: 'ln',
						right: v1
					}
				)
			);
			var res = mul(l, r);
			return res;
		}
		case '/': {
			var v1d = differentiateExpression(v1);
			var v2d = differentiateExpression(v2);
			// (f/g)' -> (f'g - fg')/(g^2)
			var v1dv2 = mul(v1d, v2);
			var v1v2d = mul(v1, v2d);
			var subtractionResult = sub(v1dv2, v1v2d);
			var v2v2 = mul(v2, v2);
			var derivative = div(subtractionResult, v2v2);
			return derivative;
		}
		case 'functionCall': {
			if (typeof v1 !== 'string')
				throw "Invalid data structure";
			let v1d = v1 + `'`;
			var v2d = differentiateExpression(v2);
			switch (v1) {
				case 'sin':
					return mul({operator: 'functionCall', left: 'cos', right: v2}, v2d);
				case 'cos':
					return sub(0, mul({operator: 'functionCall', left: 'sin', right: v2}, v2d));
				case 'ln':
					return div(v2d, v2); // chain rule
			}
			var res = mul({operator: 'functionCall', left: v1d, right: v2}, v2d);
		}
	}
	throw "No matching case in 'differentiate'"
}

var printTree = function (expr: Expr) {
    var treeToString = function (expr: Expr): string {
    	if (typeof expr === 'number')
    		return `${expr}`;
        if (typeof expr === 'string')
            return expr;

        var leftResult = treeToString(expr.left);
        var rightResult = treeToString(expr.right);

        if (expr.operator === 'functionCall') {
            if (leftResult[0] === '|')
                leftResult = leftResult.substring(1);
            if (rightResult[0] === '|')
                rightResult = rightResult.substring(1);
            return `<div class="equation">${leftResult}(${rightResult})</div>`;
        }

        if (leftResult[0] === '|') {
            leftResult = '(' + leftResult.substring(1) + ')';
        }
        if (rightResult[0] === '|') {
            rightResult = '(' + rightResult.substring(1) + ')';
        }

        // pipe is removed later, means that brackets are required aroung returned expr
        return `|${leftResult} ${expr.operator} ${rightResult}`;
    }

    return ('<div class="equation">'
        + treeToString(expr).replace(/^\|/, '')
            .replace(/\(/g, '<div class="equation">(')
            .replace(/\)/g, ')</div>')
        + '</div>');
};

var simplifyExpression = function (node: Expr): Expr {
	if (typeof node === 'number' || typeof node === 'string')
		return node;

	if (typeof node.left !== 'undefined' && typeof node.right !== 'undefined') {
		node.left = simplifyExpression(node.left);
		node.right = simplifyExpression(node.right);
	}

	var add = function (left: Expr, right: Expr) {
		return simplifyExpression({ operator: '+', left: left, right: right });
	};
	var subtract = function (left: Expr, right: Expr) {
		return simplifyExpression({ operator: '-', left: left, right: right });
	};
	var multiply = function (left: Expr, right: Expr) {
		return simplifyExpression({ operator: '*', left: left, right: right });
	};
	var divide = function (left: Expr, right: Expr) {
		return simplifyExpression({ operator: '/', left: left, right: right });
	};
	var exponent = function (left: Expr, right: Expr) {
		return simplifyExpression({ operator: '^', left: left, right: right });
	};

	switch (node.operator) {
		case '+': {
			if (compareNodes(node.left, 0))
				return node.right;
			if (compareNodes(node.right, 0))
				return node.left;
			if (typeof node.left === 'number' && typeof node.right === 'number')
				return node.left + node.right;
			if (compareNodes(node.left, node.right))
				return multiply(2, node.left);
			if (typeof node.right === 'object') // (a+(a*b)) -> (a*(b+1))
				if (node.right.operator === '*')
					if (compareNodes(node.right.left, node.left))
						return multiply(node.left, add(node.right.right, 1));
			if (typeof node.right === 'object') // (a+(b*a)) -> (a*(b+1))
				if (node.right.operator === '*')
					if (compareNodes(node.right.right, node.left))
						return multiply(node.left, add(node.right.left, 1));
			if (typeof node.left === 'object') // ((a*b)+a) -> (a*(b+1))
				if (node.left.operator === '*')
					if (compareNodes(node.left.left, node.right))
						return multiply(node.right, add(node.left.right, 1));
			if (typeof node.left === 'object') // ((b*a)+a) -> (a*(b+1))
				if (node.left.operator === '*')
					if (compareNodes(node.left.right, node.right))
						return multiply(node.right, add(node.left.left, 1));
			return node;
		}
		case '-': {
			if (compareNodes(node.right, 0))
				return node.left;
			if (typeof node.left === 'number' && typeof node.right === 'number')
				return node.left - node.right;
			if (compareNodes(node.left, node.right))
				return 0;
			return node;
		}
		case '*': {
			if (compareNodes(node.left, 0))
				return 0;
			if (compareNodes(node.right, 0))
				return 0;
			if (compareNodes(node.left, 1))
				return node.right;
			if (compareNodes(node.right, 1))
				return node.left;
			if (typeof node.left === 'number' && typeof node.right === 'number')
				return node.left * node.right;
            if (typeof node.right === 'object') // (a*(a^b)) -> a^(b+1)
                if (node.right.operator === '*')
                    if (typeof node.left === 'number' && typeof node.right.left === 'number')
                        return multiply(node.left * node.right.left, node.right.right);
			if (compareNodes(node.left, node.right))
				return simplifyExpression({ operator: '^', left: node.left, right: 2 });
			if (typeof node.right === 'object') // (a*(a^b)) -> a^(b+1)
				if (node.right.operator === '^')
					if (compareNodes(node.right.left, node.left))
						return exponent(node.left, add(node.right.right, 1));
			if (typeof node.left === 'object') // ((a^b)*a) -> a^(b+1)
				if (node.left.operator === '^')
					if (compareNodes(node.left.left, node.right))
						return exponent(node.right, add(node.left.right, 1));
			if (typeof node.right === 'object') // (a*(a*b)) -> (a^2)*b
				if (node.right.operator === '*')
					if (compareNodes(node.right.left, node.left))
						return multiply(node.right.right, exponent(node.left, 2));
			if (typeof node.left === 'object') // ((b*a)*a) -> b*(a^2)
				if (node.left.operator === '*')
					if (compareNodes(node.left.right, node.right))
						return multiply(node.left.left, exponent(node.right, 2));
			if (typeof node.right === 'object') // (a*((a^n)*b)) -> b*(a^(n+1))
				if (node.right.operator === '*')
					if (typeof node.right.left === 'object')
						if (node.right.left.operator === '^')
							if (compareNodes(node.right.left.left, node.left))
								return multiply(node.right.right, exponent(node.left, add(node.right.left.right, 1)));
            if (typeof node.left === 'object') // ((a^b)*(c/a)) -> c*(a^(b-1))
                if (node.left.operator === '^')
                    if (typeof node.right === 'object') // ((a^b)*(c/a)) -> c*(a^(b-1))
                        if (node.right.operator === '/')
                            if (compareNodes(node.left.left, node.right.right))
                                return multiply(node.right.left, exponent(node.left.left, subtract(node.left.right, 1)));
			return node;
		}
		case '/': {
			if (compareNodes(node.left, 0))
				return 0;
			if (compareNodes(node.right, 0))
				return NaN;
			if (compareNodes(node.right, 1))
				return node.left;
			if (typeof node.left === 'number' && typeof node.right === 'number')
				return node.left / node.right;
			if (compareNodes(node.left, node.right))
				return 1;
			return node;
		}
		case '^': {
			if (compareNodes(node.left, 0))
				return 0;
			if (compareNodes(node.right, 0))
				return 1;
			if (compareNodes(node.left, 1))
				return 1;
			if (compareNodes(node.right, 1))
				return node.left;
			if (typeof node.left === 'number' && typeof node.right === 'number')
				return Math.pow(node.left, node.right);
			return node;
		}
		case 'functionCall': {
			return node;
		}
	}
	throw "No matching case in 'simplify'"
};

function recalculate() {
	try {
		var differentiate = function () {
			var startTime = new Date().getTime(); // ms since 1970
			var input = (<HTMLInputElement>document!.getElementById('functionTextBox')!).value;

			var result = parser.parse(input);
			var addPrimeToFunction = false;

			if ($('#simplifyCheckbox1').is(':checked')){
				result = simplifyExpression(result);
			}

			if ($('#differentiateCheckbox').is(':checked')) {
				result = differentiateExpression(result);
				addPrimeToFunction = true;
			}

			if ($('#simplifyCheckbox2').is(':checked')){
				result = simplifyExpression(result);
			}

			result = printTree(result);
			var endTime = new Date().getTime();
			var duration = endTime - startTime;
			var primeToAdd = addPrimeToFunction ? `'` : ``;
			return `f${primeToAdd}(x) = ${result}<br><br>${duration}ms`;
		};
		$('#output').css('color', '#000');
		$('#output').html(differentiate());
	} catch (err) {
		$('#output').css('color', '#f00');
		var errorMessage = 'Invalid input.';
		if (err.message) {
			errorMessage += ' ' + err.message;
		}
		$('#output').html(errorMessage);
	}
}

$(document).ready(function () {
	$('#output').on('mouseenter mouseleave', '.equation', function() {
		$(this).toggleClass('hover');
	});

	$('#output').on('mouseover', '.equation', function (e) {
		if ($(this).children('.hover').length === 0) {
			$(this).addClass('highlight');
			$(this).find('div').addClass('highlight'); // $().find() works like .children(), but it is recursive
		}
	});
	$('#output').on('mouseout', '.equation', function (e) {
		$(this).removeClass('highlight');
		$(this).find('div').removeClass('highlight');
	});
});
