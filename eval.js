var add = function (v1, v2) {
	var result = { tag: 'addition', left: v1, right: v2 };
	/*if (v1 === 0)
		result = v2;
	if (v2 === 0)
		result = v1;
	if (!isNaN(v1) && !isNaN(v2))
		result = v1 + v2;
	else if (v1 === v2)
		result = mul(v1, 2);*/
	return result;
}
var sub = function (v1, v2) {
	var result = { tag: 'subtraction', left: v1, right: v2 };
	/*if (v2 === 0)
		result = v1;
	if (!isNaN(v1) && !isNaN(v2)) {
		result = v1 - v2;
	}*/
	return result;
}
var mul = function (v1, v2) {
	var result = { tag: 'multiplication', left: v1, right: v2 };
	/*if (v1 === 0)
		result = 0;
	else if (v2 === 0)
		result = 0;
	else if (v1 === 1)
		result = v2;
	else if (v2 === 1)
		result = v1;
	else if (v1 === v2)
		result = exp(v1, 2 ;*/
	return result;
}
var div = function (v1, v2) {
	var result = { tag: 'division', left: v1, right: v2 };
	/*if (v2 === 0)
		result = NaN;
	else if (v1 === 0)
		result = 0;
	else if (v2 === 1)
		result = v1;*/
	return result;
}
var exp = function (v1, v2) {
	var result = { tag: 'exponent', left: v1, right: v2 };
	/*if (v1 === 0) // 0^n
		result = 0;
	else if (v2 === 0) // n^0
		result = 1;
	else if (v1 === 1) // 1^n
		result = 1;
	else if (v2 === 1) // n^1
		result = v1;*/
	return result;
}

function evalExpr(expr, cont) {
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
				evalExpr, expr.left, function (v1, v1d) {
					return thunk(
						evalExpr, expr.right, function (v2, v2d) {
							return thunk(cont, { tag: 'addition', left: v1, right: v2 }, add(v1d, v2d));
						});
				});
		case 'subtraction':
			return thunk(
				evalExpr, expr.left, function (v1, v1d) {
					return thunk(
						evalExpr, expr.right, function (v2, v2d) {
							return thunk(cont, { tag: 'subtraction', left: v1, right: v2 }, sub(v1d, v2d));
						});
				});
		case 'multiplication':
			return thunk(
				evalExpr, expr.left, function (v1, v1d) {
					return thunk(
						evalExpr, expr.right, function (v2, v2d) {
							if (!isNaN(v1) && !isNaN(v2)) {
								// x*x -> 2x
								if (v1 === 'x' && v2 === 'x') {
									return thunk(cont, { tag: 'multiplication', left: 'x', right: 'x' }, mul(2, 'x'));
								}
								// Coefficient and x
								// kx -> k
								if (v2 === 'x')
									return thunk(cont, { tag: 'multiplication', left: v1, right: v2 }, v1);
								if (v1 === 'x')
									return thunk(cont, { tag: 'multiplication', left: v2, right: v1 }, v2);

								if (v1d === 0 || v2d === 0) {
									// 0 * 0 = 0
									return thunk(cont, { tag: 'multiplication', left: v1, right: v2 }, 0);
								}
							}


							if (isNaN(v1) && isNaN(v2)) {
								// (fg)' -> f'g + g'f
								return thunk(cont, 
									{ tag: 'multiplication', left: v2, right: v1 }, 
									add(mul(v1d, v2), mul(v1, v2d)));
							}

							// Coeffient and function
							// kf -> kf'
							var k, f, fd;
							if (!isNaN(v1d)) {
								k = v1;
								f = v2;
								fd = v2d;
							} else if (!isNaN(v2d)) {
								f = v1;
								fd = v2d;
								k = v2;
							}
							if (k === 0)
								return thunk(cont, 0, 0);
							if (k === 1)
								return thunk(cont, f, fd);
							return thunk(cont, { tag: 'multiplication', left: k, right: f }, mul(k, fd));
						});
				});
		case 'exponent':
			return thunk(
				evalExpr, expr.left, function (v1, v1d) {
					return thunk(
						evalExpr, expr.right, function (v2, v2d) {
							var x = v1;
							var n = v2;
							var newExponent = n-1;
							if (typeof newExponent === 'undefined' || isNaN(newExponent))
								newExponent = sub(n, 1);
							var oldObj = { tag: 'exponent', left: x, right: n };
							var newObj = mul(v1d, mul(n, exp(x, newExponent)));
							return thunk(cont, oldObj, newObj);
						});
				});
		case 'division':
			return thunk(
				evalExpr, expr.left, function (v1, v1d) {
					return thunk(
						evalExpr, expr.right, function (v2, v2d) {
							var v1dv2 = mul(v1d, v2);
							var v1v2d = mul(v1, v2d);
							var subtractionResult = sub(v1dv2, v1v2d);
							var v2v2 = mul(v2, v2);
							var derivative = div(subtractionResult, v2v2);
							return thunk(cont, { tag: 'division', left: v1, right: v2 }, derivative);
						});
				});
		case 'function':
			return thunk(
				evalExpr, expr.name, function (name) {
					return thunk(
						evalExpr, expr.argument, function(v, vd) { // vd is the derivative of v
							if (typeof v === 'number') {
								return thunk(cont, v, 0); // return 0 because argument is a number which makes the function constant
							}
							var oldObj = { tag: 'function', name: name, argument: v };
							var newObj = mul({ tag: 'function', name: name, argument: v }, vd);
							function setFunctionName(newName) {
								if (typeof newObj.left !== 'undefined')
									newObj.left.name = newName;
								else
									newObj.name = newName;
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
									newObj = mul(div(1, v), vd);
									break;
								default:
									if (typeof newObj.left !== 'undefined')
										newObj.left.name += '\'';
									else
										newObj.name += '\'';
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
}

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
}