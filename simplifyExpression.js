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
				return { operator: 'multiplication', left: node.left, right: 2 };
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
			if (compareNodes(node.left, node.right))
				return simplifyExpression({ operator: '^', left: node.left, right: 2 });
			if (typeof node.right.operator !== 'undefined') // (a*(a^b)) -> a^(b+1)
				if (node.right.operator === '^')
					if (compareNodes(node.right.left, node.left))
						return exponent(node.left, node.right.right + 1);
			if (typeof node.left.operator !== 'undefined') // ((a^b)*a) -> a^(b+1)
				if (node.left.operator === '^')
					if (compareNodes(node.left.left, node.right))
						return exponent(node.right, node.left.right + 1);
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
			if (compareNodes(node.left, node.right))
				return 1;
			return node;
		}
		case 'functionCall': {
			return node;
		}
	}
};
