var add = function (v1, v2) {
    var result = { operator: '+', left: v1, right: v2 };
    return result;
};
var sub = function (v1, v2) {
    var result = { operator: '-', left: v1, right: v2 };
    return result;
};
var mul = function (v1, v2) {
    var result = { operator: '*', left: v1, right: v2 };
    return result;
};
var div = function (v1, v2) {
    var result = { operator: '/', left: v1, right: v2 };
    return result;
};
var exp = function (v1, v2) {
    var result = { operator: '^', left: v1, right: v2 };
    return result;
};
var compareNodes = function (a, b) {
    if (typeof a === 'number' || typeof a === 'string' || typeof b === 'number' || typeof b === 'string')
        return a === b;
    if (typeof a.operator !== 'undefined' && typeof b.operator !== 'undefined')
        return compareNodes(a.operator, b.operator) && compareNodes(a.left, b.left) && compareNodes(a.right, b.right);
    throw "Unable to compare nodes!";
};
function differentiateExpression(expr, cont) {
    if (typeof expr === 'number') {
        return thunk(cont, expr, 0);
    }
    if (typeof expr === 'string') {
        if (expr === 'x')
            return thunk(cont, 'x', 1);
        return thunk(cont, expr, expr);
    }
    switch (expr.operator) {
        case '+':
            return thunk(differentiateExpression, expr.left, function (v1, v1d) {
                return thunk(differentiateExpression, expr.right, function (v2, v2d) {
                    return thunk(cont, add(v1, v2), add(v1d, v2d));
                });
            });
        case '-':
            return thunk(differentiateExpression, expr.left, function (v1, v1d) {
                return thunk(differentiateExpression, expr.right, function (v2, v2d) {
                    return thunk(cont, sub(v1, v2), sub(v1d, v2d));
                });
            });
        case '*':
            return thunk(differentiateExpression, expr.left, function (v1, v1d) {
                return thunk(differentiateExpression, expr.right, function (v2, v2d) {
                    if (!isNaN(v1) && !isNaN(v2)) {
                        // x*x -> 2x
                        if (v1 === 'x' && v2 === 'x') {
                            return thunk(cont, mul('x', 'x'), mul(2, 'x'));
                        }
                        // Coefficient and x
                        // kx -> k
                        if (v2 === 'x')
                            return thunk(cont, mul(v1, v2), v1);
                        if (v1 === 'x')
                            return thunk(cont, mul(v2, v1), v2);
                        if (v1d === 0 || v2d === 0) {
                            // 0 * 0 = 0
                            return thunk(cont, mul(v1, v2), 0);
                        }
                    }
                    if (isNaN(v1) && isNaN(v2)) {
                        // (fg)' -> f'g + g'f
                        return thunk(cont, mul(v1, v2), add(mul(v1d, v2), mul(v1, v2d)));
                    }
                    // Coeffient and function
                    // kf -> kf'
                    var k, f, fd;
                    if (!isNaN(v1d)) {
                        k = v1;
                        f = v2;
                        fd = v2d;
                    }
                    else if (!isNaN(v2d)) {
                        k = v2;
                        f = v1;
                        fd = v1d;
                    }
                    if (k === 0)
                        return thunk(cont, 0, 0);
                    if (k === 1)
                        return thunk(cont, f, fd);
                    return thunk(cont, mul(k, f), mul(k, fd));
                });
            });
        case '^':
            return thunk(differentiateExpression, expr.left, function (v1, v1d) {
                return thunk(differentiateExpression, expr.right, function (v2, v2d) {
                    //  f ^g  ' = f ^g *(f'  g /f +  g'  ln(f ))
                    // (v1^v2)' = v1^v2*(v1d*v2/v1 + v2d*ln(v1))
                    var l = exp(v1, v2);
                    var r = add(div(mul(v1d, v2), v1), mul(v2d, {
                        operator: 'functionCall',
                        left: 'ln',
                        right: v1
                    }));
                    var res = mul(l, r);
                    return thunk(cont, exp(v1, v2), res);
                });
            });
        case '/':
            return thunk(differentiateExpression, expr.left, function (v1, v1d) {
                return thunk(differentiateExpression, expr.right, function (v2, v2d) {
                    // (f/g)' -> (f'g - fg')/(g^2)
                    var v1dv2 = mul(v1d, v2);
                    var v1v2d = mul(v1, v2d);
                    var subtractionResult = sub(v1dv2, v1v2d);
                    var v2v2 = mul(v2, v2);
                    var derivative = div(subtractionResult, v2v2);
                    return thunk(cont, div(v1, v2), derivative);
                });
            });
        case 'functionCall':
            return thunk(differentiateExpression, expr.left, function (name) {
                return thunk(
                // vd is the derivative of v
                differentiateExpression, expr.right, function (v, vd) {
                    if (typeof v === 'number') {
                        // return 0 because argument is a number which makes the function constant
                        return thunk(cont, v, 0);
                    }
                    var oldObj = { operator: 'functionCall', left: name, right: v };
                    var newObj = mul({ operator: 'functionCall', left: name, right: v }, vd);
                    function setFunctionName(newName) {
                        if (typeof newObj.left !== 'undefined')
                            newObj.left.left = newName;
                        else
                            newObj.left = newName;
                    }
                    switch (name) {
                        case 'sin':
                            setFunctionName('cos');
                            break;
                        case 'cos':
                            setFunctionName('sin');
                            newObj = sub(0, newObj);
                            break;
                        case 'ln':
                            newObj = div(vd, v); // *vd: chain rule
                            break;
                        default:
                            if (typeof newObj.left !== 'undefined')
                                newObj.left.left += '\'';
                            else
                                newObj.left += '\'';
                            break;
                    }
                    return thunk(cont, oldObj, newObj);
                });
            });
    }
    throw "No matching case in 'differentiate'";
}
var thunk = function (f, ...args) {
    return { tag: 'thunk', func: f, args: args };
};
var trampoline = function (thk) {
    while (true) {
        if (thk.tag === 'value') {
            return thk.val;
        }
        else if (thk.tag === 'thunk') {
            thk = thk.func.apply(null, thk.args);
        }
        else {
            throw new Error('Bad thunk');
        }
    }
};
var printTree = function (expr) {
    var treeToString = function (expr) {
        if (typeof expr === 'number')
            return '' + expr;
        if (typeof expr === 'string')
            return expr;
        var leftResult = treeToString(expr.left);
        var rightResult = treeToString(expr.right);
        if (expr.operator === 'functionCall') {
            if (leftResult[0] === '|')
                leftResult = leftResult.substring(1);
            if (rightResult[0] === '|')
                rightResult = rightResult.substring(1);
            return '<div class="equation">' + leftResult + '(' + rightResult + ')</div>';
        }
        if (leftResult[0] === '|') {
            leftResult = '(' + leftResult.substring(1) + ')';
        }
        if (rightResult[0] === '|') {
            rightResult = '(' + rightResult.substring(1) + ')';
        }
        // pipe is removed later, means that brackets are required aroung returned expr
        return '|' + leftResult + ' ' + expr.operator + ' ' + rightResult;
    };
    return ('<div class="equation">'
        + treeToString(expr).replace(/^\|/, '')
            .replace(/\(/g, '<div class="equation">(')
            .replace(/\)/g, ')</div>')
        + '</div>');
};
var simplifyExpression = function (node) {
    if (typeof node === 'number' || typeof node === 'string')
        return node;
    if (typeof node.left !== 'undefined' && typeof node.right !== 'undefined') {
        node.left = simplifyExpression(node.left);
        node.right = simplifyExpression(node.right);
    }
    var add = function (left, right) {
        return simplifyExpression({ operator: '+', left: left, right: right });
    };
    var subtract = function (left, right) {
        return simplifyExpression({ operator: '-', left: left, right: right });
    };
    var multiply = function (left, right) {
        return simplifyExpression({ operator: '*', left: left, right: right });
    };
    var divide = function (left, right) {
        return simplifyExpression({ operator: '/', left: left, right: right });
    };
    var exponent = function (left, right) {
        return simplifyExpression({ operator: '^', left: left, right: right });
    };
    switch (node.operator) {
        case '+': {
            if (compareNodes(node.left, 0))
                return node.right;
            if (compareNodes(node.right, 0))
                return node.left;
            if (!isNaN(node.left) && !isNaN(node.right))
                return node.left + node.right;
            if (compareNodes(node.left, node.right))
                return multiply(2, node.left);
            if (typeof node.right.operator !== 'undefined') // (a+(a*b)) -> (a*(b+1))
                if (node.right.operator === '*')
                    if (compareNodes(node.right.left, node.left))
                        return multiply(node.left, add(node.right.right, 1));
            if (typeof node.right.operator !== 'undefined') // (a+(b*a)) -> (a*(b+1))
                if (node.right.operator === '*')
                    if (compareNodes(node.right.right, node.left))
                        return multiply(node.left, add(node.right.left, 1));
            if (typeof node.left.operator !== 'undefined') // ((a*b)+a) -> (a*(b+1))
                if (node.left.operator === '*')
                    if (compareNodes(node.left.left, node.right))
                        return multiply(node.right, add(node.left.right, 1));
            if (typeof node.left.operator !== 'undefined') // ((b*a)+a) -> (a*(b+1))
                if (node.left.operator === '*')
                    if (compareNodes(node.left.right, node.right))
                        return multiply(node.right, add(node.left.left, 1));
            return node;
        }
        case '-': {
            if (compareNodes(node.right, 0))
                return node.left;
            if (!isNaN(node.left) && !isNaN(node.right))
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
            if (!isNaN(node.left) && !isNaN(node.right))
                return node.left * node.right;
            if (typeof node.right.operator !== 'undefined') // (a*(a^b)) -> a^(b+1)
                if (node.right.operator === '*')
                    if (!isNaN(node.left) && !isNaN(node.right.left))
                        return multiply(node.left * node.right.left, node.right.right);
            if (compareNodes(node.left, node.right))
                return simplifyExpression({ operator: '^', left: node.left, right: 2 });
            if (typeof node.right.operator !== 'undefined') // (a*(a^b)) -> a^(b+1)
                if (node.right.operator === '^')
                    if (compareNodes(node.right.left, node.left))
                        return exponent(node.left, add(node.right.right, 1));
            if (typeof node.left.operator !== 'undefined') // ((a^b)*a) -> a^(b+1)
                if (node.left.operator === '^')
                    if (compareNodes(node.left.left, node.right))
                        return exponent(node.right, add(node.left.right, 1));
            if (typeof node.right.operator !== 'undefined') // (a*(a*b)) -> (a^2)*b
                if (node.right.operator === '*')
                    if (compareNodes(node.right.left, node.left))
                        return multiply(node.right.right, exponent(node.left, 2));
            if (typeof node.left.operator !== 'undefined') // ((b*a)*a) -> b*(a^2)
                if (node.left.operator === '*')
                    if (compareNodes(node.left.right, node.right))
                        return multiply(node.left.left, exponent(node.right, 2));
            if (typeof node.right.operator !== 'undefined') // (a*((a^n)*b)) -> b*(a^(n+1))
                if (node.right.operator === '*')
                    if (node.right.left.operator !== 'undefined')
                        if (node.right.left.operator === '^')
                            if (compareNodes(node.right.left.left, node.left))
                                return multiply(node.right.right, exponent(node.left, add(node.right.left.right, 1)));
            if (typeof node.left.operator !== 'undefined') // ((a^b)*(c/a)) -> c*(a^(b-1))
                if (node.left.operator === '^')
                    if (typeof node.right.operator !== 'undefined') // ((a^b)*(c/a)) -> c*(a^(b-1))
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
            if (!isNaN(node.left) && !isNaN(node.right))
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
            if (!isNaN(node.left) && !isNaN(node.right))
                return Math.pow(node.left, node.right);
            return node;
        }
        case 'functionCall': {
            return node;
        }
    }
};
function recalculate() {
    try {
        var differentiate = function () {
            var startTime = new Date().getTime(); // ms since 1970
            var thunkValue = function (v, vd) {
                return { tag: 'value', val: vd };
            };
            var result = document.getElementById('functionTextBox').value;
            result = parser.parse(result);
            var addPrimeToFunction = false;
            if ($('#simplifyCheckbox1').is(':checked')) {
                result = simplifyExpression(result);
            }
            if ($('#differentiateCheckbox').is(':checked')) {
                result = differentiateExpression(result, thunkValue);
                result = trampoline(result);
                addPrimeToFunction = true;
            }
            if ($('#simplifyCheckbox2').is(':checked')) {
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
    }
    catch (err) {
        $('#output').css('color', '#f00');
        var errorMessage = 'Invalid input.';
        if (err.message) {
            errorMessage += ' ' + err.message;
        }
        $('#output').html(errorMessage);
    }
}
$(document).ready(function () {
    $('#output').on('mouseenter mouseleave', '.equation', function () {
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
