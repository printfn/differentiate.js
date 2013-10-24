var add = function (v1, v2) {
	var result = { tag: 'addition', left: v1, right: v2 };
	return result;
};
var sub = function (v1, v2) {
	var result = { tag: 'subtraction', left: v1, right: v2 };
	return result;
};
var mul = function (v1, v2) {
	var result = { tag: 'multiplication', left: v1, right: v2 };
	return result;
};
var div = function (v1, v2) {
	var result = { tag: 'division', left: v1, right: v2 };
	return result;
};
var exp = function (v1, v2) {
	var result = { tag: 'exponent', left: v1, right: v2 };
	return result;
};

var compareNodes = function (a, b) {
	if (typeof a === 'number' || typeof a === 'string' || typeof b === 'number' || typeof b === 'string')
		return a === b;
	if (typeof a.tag !== 'undefined' && typeof a.left !== 'undefined' && typeof a.right !== 'undefined')
		if (typeof b.tag !== 'undefined' && typeof b.left !== 'undefined' && typeof b.right !== 'undefined')
			return compareNodes(a.tag, b.tag) && compareNodes(a.left, b.left) && compareNodes(a.right, b.right);
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
	switch (expr.tag) {
		case 'addition':
			return thunk(
				differentiateExpression, expr.left, function (v1, v1d) {
					return thunk(
						differentiateExpression, expr.right, function (v2, v2d) {
							return thunk(cont, add(v1, v2), add(v1d, v2d));
						});
				});
		case 'subtraction':
			return thunk(
				differentiateExpression, expr.left, function (v1, v1d) {
					return thunk(
						differentiateExpression, expr.right, function (v2, v2d) {
							return thunk(cont, sub(v1, v2), sub(v1d, v2d));
						});
				});
		case 'multiplication':
			return thunk(
				differentiateExpression, expr.left, function (v1, v1d) {
					return thunk(
						differentiateExpression, expr.right, function (v2, v2d) {
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
							} else if (!isNaN(v2d)) {
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
		case 'exponent':
			return thunk(
				differentiateExpression, expr.left, function (v1, v1d) {
					return thunk(
						differentiateExpression, expr.right, function (v2, v2d) {
							var x = v1;
							var n = v2;
							var newExponent = n-1;
							if (typeof newExponent === 'undefined' || isNaN(newExponent))
								newExponent = sub(n, 1);
							var oldObj = exp(x, n);
							var newObj = mul(v1d, mul(n, exp(x, newExponent)));
							return thunk(cont, oldObj, newObj);
						});
				});
		case 'division':
			return thunk(
				differentiateExpression, expr.left, function (v1, v1d) {
					return thunk(
						differentiateExpression, expr.right, function (v2, v2d) {
							// (f/g)' -> (f'g - fg')/(g^2)
							var v1dv2 = mul(v1d, v2);
							var v1v2d = mul(v1, v2d);
							var subtractionResult = sub(v1dv2, v1v2d);
							var v2v2 = mul(v2, v2);
							var derivative = div(subtractionResult, v2v2);
							return thunk(cont, div(v1, v2), derivative);
						});
				});
		case 'function':
			return thunk(
				differentiateExpression, expr.left, function (name) {
					return thunk(
						// vd is the derivative of v
						differentiateExpression, expr.right, function(v, vd) {
							if (typeof v === 'number') {
								// return 0 because argument is a number which makes the function constant
								return thunk(cont, v, 0);
							}
							var oldObj = { tag: 'function', left: name, right: v };
							var newObj = mul({ tag: 'function', left: name, right: v }, vd);
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
									newObj = mul(div(1, v), vd); // *vd: chain rule
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
}

var thunk = function (f) {
	var args = Array.prototype.slice.call(arguments);
	args.shift();
	return { tag: 'thunk', func: f, args: args };
};

var trampoline = function (thk) {
	while (true) {
		if (thk.tag === 'value') {
			return thk.val;
		} else if (thk.tag === 'thunk') {
			thk = thk.func.apply(null, thk.args);
		} else {
			throw new Error('Bad thunk');
		}
	}
};
