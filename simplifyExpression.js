var simplifyExpression = function (tree) {
	return simplifyNode(tree);
}

var simplifyNode = function (node) {
	if (typeof node === 'number' || typeof node === 'string')
		return node;

	if (typeof node.left !== 'undefined' && typeof node.right !== 'undefined') {
		node.left = simplifyNode(node.left);
		node.right = simplifyNode(node.right);
	}

	switch (node.tag) {
		case 'addition': {
			if (node.left === 0)
				return node.right;
			if (node.right === 0)
				return node.left;
			if (!isNaN(node.left) && !isNaN(node.right))
				return node.left + node.right;
			if (node.left === node.right)
				return { tag: 'multiplication', left: node.left, right: 2 };
			if (typeof node.right.tag !== 'undefined') // (a+(a*b)) -> (a*(b+1))
				if (node.right.tag === 'multiplication')
					if (compareNodes(node.right.left, node.left))
						return simplifyNode({ tag: 'multiplication', left: node.left, right: simplifyNode({ tag: 'addition', left: node.right.right, right: 1 }) });
			if (typeof node.right.tag !== 'undefined') // (a+(b*a)) -> (a*(b+1))
				if (node.right.tag === 'multiplication')
					if (compareNodes(node.right.right, node.left))
						return simplifyNode({ tag: 'multiplication', left: node.left, right: simplifyNode({ tag: 'addition', left: node.right.left, right: 1 }) });
			if (typeof node.left.tag !== 'undefined') // ((a*b)+a) -> (a*(b+1))
				if (node.left.tag === 'multiplication')
					if (compareNodes(node.left.left, node.right))
						return simplifyNode({ tag: 'multiplication', left: node.right, right: simplifyNode({ tag: 'addition', left: node.left.right, right: 1 }) });
			if (typeof node.left.tag !== 'undefined') // ((b*a)+a) -> (a*(b+1))
				if (node.left.tag === 'multiplication')
					if (compareNodes(node.left.right, node.right))
						return simplifyNode({ tag: 'multiplication', left: node.right, right: simplifyNode({ tag: 'addition', left: node.left.left, right: 1 }) });
			return node;
		}
		case 'subtraction': {
			if (node.right === 0)
				return node.left;
			if (!isNaN(node.left) && !isNaN(node.right))
				return node.left - node.right;
			if (node.left === node.right)
				return 0;
			return node;
		}
		case 'multiplication': {
			if (node.left === 0)
				return 0;
			if (node.right === 0)
				return 0;
			if (node.left === 1)
				return node.right;
			if (node.right === 1)
				return node.left;
			if (!isNaN(node.left) && !isNaN(node.right))
				return node.left * node.right;
			if (node.left === node.right)
				return simplifyNode({ tag: 'exponent', left: node.left, right: 2 });
			if (typeof node.right.tag !== 'undefined') // (a*(a^b)) -> a^(b+1)
				if (node.right.tag === 'exponent')
					if (compareNodes(node.right.left, node.left))
						return simplifyNode({ tag: 'exponent', left: node.left, right: node.right.right + 1 });
			if (typeof node.left.tag !== 'undefined') // ((a^b)*a) -> a^(b+1)
				if (node.left.tag === 'exponent')
					if (compareNodes(node.left.left, node.right))
						return simplifyNode({ tag: 'exponent', left: node.right, right: node.left.right + 1 });
			if (typeof node.right.tag !== 'undefined') // (a*(a*b)) -> (a^2)*b
				if (node.right.tag === 'multiplication')
					if (compareNodes(node.right.left, node.left))
						return simplifyNode({ tag: 'multiplication', left: node.right.right, right: simplifyNode({ tag: 'exponent', left: node.left, right: 2 }) });
			if (typeof node.left.tag !== 'undefined') // ((b*a)*a) -> (a^2)*b
				if (node.left.tag === 'multiplication')
					if (compareNodes(node.left.right, node.right))
						return simplifyNode({ tag: 'multiplication', left: simplifyNode({ tag: 'exponent', left: node.right, right: 2 }), right: node.left.left });
			if (typeof node.right.tag !== 'undefined') // (a*((a^n)*b)) -> b*(a^(n+1))
				if (node.right.tag === 'multiplication')
					if (node.right.left.tag !== 'undefined')
						if (node.right.left.tag === 'exponent')
							if (compareNodes(node.right.left.left, node.left))
								return simplifyNode({
									tag: 'multiplication',
									left: node.right.right,
									right: simplifyNode(
										{
											tag: 'exponent',
											left: node.left,
											right: simplifyNode(
												{
													tag: 'addition',
													left: node.right.left.right,
													right: 1
												})
										})
								});
			return node;
		}
		case 'division': {
			if (node.left === 0)
				return 0;
			if (node.right === 0)
				return NaN;
			if (node.right === 1)
				return node.left;
			if (!isNaN(node.left) && !isNaN(node.right))
				return node.left / node.right;
			if (node.left === node.right)
				return 1;
			return node;
		}
		case 'exponent': {
			if (node.left === 0)
				return 0;
			if (node.right === 0)
				return 1;
			if (node.left === 1)
				return 1;
			if (node.right === 1)
				return node.left;
			if (!isNaN(node.left) && !isNaN(node.right))
				return Math.pow(node.left, node.right);
			if (node.left === node.right)
				return 1;
			return node;
		}
		case 'function': {
			return node;
		}
	}
}

var compareNodes = function (a, b) {
	if (typeof a === 'number' || typeof a === 'string')
		return a === b;
	if (typeof a.tag !== 'undefined' && typeof a.left !== 'undefined' && typeof a.right !== 'undefined')
		if (typeof b.tag !== 'undefined' && typeof b.left !== 'undefined' && typeof b.right !== 'undefined')
			return compareNodes(a.tag, b.tag) && compareNodes(a.left, b.left) && compareNodes(a.right, b.right);
	if (typeof a.tag !== 'undefined' && typeof a.name !== 'undefined' && typeof a.argument !== 'undefined')
		if (typeof b.tag !== 'undefined' && typeof b.name !== 'undefined' && typeof b.argument !== 'undefined')
			return compareNodes(a.tag, b.tag) && compareNodes(a.name, b.name) && compareNodes(a.argument, b.argument);
}