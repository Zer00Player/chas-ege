(function() {
	retryWhileError(function() {
		NAinfo.requireApiVersion(0, 2);

		let key = '526994';
		let preference = ['two_legs', 'leg_and_hypotenuse'];
		let rand = getSelectedPreferenceFromList(key, preference);

		// Верхняя граница первого катета зависит от варианта
		let aMax = [20, 15][rand];

		let a = sl(3, aMax);
		let b = sl(3, 20);
		// Хотя бы один катет чётный - тогда площадь основания и объём целые
		if ((a * b) % 2 !== 0) {
			b += 1;
		}
		genAssert(
			a <= 3 * b && b <= 3 * a,
			'Катеты не должны отличаться более чем втрое, иначе чертёж получается нечитаемым'
		);
		let h = sl(Math.max(2, Math.ceil(Math.max(a, b) / 3)), Math.min(12, 3 * Math.min(a, b)));

		// Прямая призма с прямоугольным треугольником в основании - класс из lib/figure.js.
		// Вершины: 0, 1, 2 - нижнее основание (прямой угол в вершине 0), 3, 4, 5 - верхнее,
		// причём вершина i+3 лежит ровно над вершиной i.
		let prism = new RectangularPrismWithRightAngledTriangleAtBase({
			height: h,
			sideA: a,
			sideB: b,
		});

		// Площадь основания и объём запрашиваем у класса, а не пересчитываем вручную.
		// Класс считает площадь по формуле Герона через гипотенузу sqrt(a*a+b*b),
		// поэтому значение целое лишь с точностью до погрешности плавающей точки.
		genAssertAlmostInteger(prism.baseArea, 'Площадь основания должна быть целой');
		genAssertAlmostInteger(prism.volume, 'Объём призмы должен быть целым');
		let S = Math.round(prism.baseArea);
		let V = Math.round(prism.volume);

		// Гипотенуза нужна только второму варианту, но считаем один раз.
		// TeX-представление корня даёт библиотечный Number.prototype.texsqrt,
		// его первый аргумент - выносить ли множители из-под корня.
		// Второй аргумент здесь лишний: он печатает вынесенный множитель даже когда
		// тот равен единице, и получалось «1\sqrt{569}» вместо «\sqrt{569}».
		let c2 = a * a + b * b;
		let cLatex = c2.texsqrt(true);

		// Обозначения вершин: нижнее основание и оно же с индексом 1
		let letters = latbukv.slice(0, 3);
		let osn = letters.join('');
		let prismName = osn + letters.map(function(letter) {
			return letter + '_1';
		}).join('');
		let ab = letters[0] + letters[1];
		let ac = letters[0] + letters[2];
		let bc = letters[1] + letters[2];

		let textOptions = [
			'В основании прямой призмы $' + prismName + '$ лежит прямоугольный треугольник $' + osn +
				'$ с прямым углом при вершине $' + letters[0] + '$ и катетами $' + ab + ' = ' + a +
				'$ и $' + ac + ' = ' + b + '$. ',
			'В основании прямой призмы $' + prismName + '$ лежит прямоугольный треугольник $' + osn +
				'$ с прямым углом при вершине $' + letters[0] + '$, катет $' + ab + '$ равен $' + a +
				'$, а гипотенуза $' + bc + '$ равна $' + cLatex + '$. ',
		];
		let analysOptions = [
			'Площадь прямоугольного треугольника равна половине произведения катетов: $S = \\frac{' +
				a + ' \\cdot ' + b + '}{2} = ' + S + '$. ',
			'По теореме Пифагора катет $' + ac + ' = \\sqrt{' + bc + '^2 - ' + ab + '^2} = \\sqrt{' +
				c2 + ' - ' + a * a + '} = \\sqrt{' + b * b + '} = ' + b +
				'$. Площадь основания: $S = \\frac{' + a + ' \\cdot ' + b + '}{2} = ' + S + '$. ',
		];

		let text = textOptions[rand] + 'Найдите объём призмы, если её высота равна $' + h + '$.';
		let analys = analysOptions[rand] + 'Объём призмы: $V = S \\cdot h = ' + S + ' \\cdot ' + h + ' = ' + V + '$.';

		// Вершины берём у класса, но высоту восстанавливаем.
		// findTriangleVertices() кладёт основание в плоскость z=-height/2, а затем
		// вычитает z центра описанной окружности (тоже -height/2), из-за чего нижнее
		// основание оказывается в z=0, а верхнее - в z=+height/2: высота призмы на
		// чертеже выходит вдвое меньше заданной. Чертёж обязан быть пропорционален
		// условию (md/task_geometry.md), поэтому возвращаем основания на -h/2 и +h/2.
		let vertices = prism.verticesOfFigure.map(function(vertex, index) {
			return { x: vertex.x, y: vertex.y, z: (index < 3 ? -0.5 : 0.5) * h };
		});

		let camera = {
			x: 0,
			y: 0,
			z: 0,
			scale: 5,
			rotationX: -Math.PI / 2 + Math.PI / 9,
			rotationY: 0,
			rotationZ: Math.PI / 10,
		};

		// autoScale() сама проектирует вершины и ДОБИРАЕТ camera.scale до нужного,
		// поэтому после неё проекцию пересчитываем уже с подобранным масштабом
		// (приём из zdn/matege2024b/13/509658.js).
		// Вручную домножать координаты на camera.scale нельзя: project3DTo2D() уже
		// умножает на него, повторное умножение уводило отметку прямого угла за холст.
		autoScale(vertices, camera, vertices.map(function(vertex) {
			return project3DTo2D(vertex, camera);
		}), {
			startX: -150,
			finishX: 150,
			startY: -150,
			finishY: 150,
			maxScale: 200,
		});
		let points2D = vertices.map(function(vertex) {
			return project3DTo2D(vertex, camera);
		});

		// Матрицу смежности берём у класса и работаем с её копией: сеттер
		// connectionMatrix у IrregularTriangularPrism не работает - геттер возвращает
		// собственный литерал и игнорирует присвоенное значение.
		let matrix = prism.connectionMatrix.map(function(row) {
			return row.slice();
		});
		// Невидимые рёбра рисуем пунктиром: в drawFigure значение-массив задаёт штрихи.
		// matrix[i][j] - это ребро между точками i+1 и j, поэтому три ребра,
		// инцидентные дальней от зрителя вершине 0, - это [0][0], [1][0] и [2][0].
		// При нашей камере нижнее основание обращено от зрителя, а из боковых граней
		// видны не все, так что невидимы ровно рёбра (0,1), (0,2) и (0,3);
		// набор не зависит от пропорций призмы (проверено на всех a:b:h,
		// которые способен выдать шаблон).
		let dash = [7, 5];
		matrix[0][0] = dash;
		matrix[1][0] = dash;
		matrix[2][0] = dash;

		let paint1 = function(ctx) {
			ctx.translate(200, 200);
			ctx.strokeStyle = om.secondaryBrandColors.iz();
			ctx.lineWidth = 2;

			ctx.drawFigure(points2D, matrix);

			// Отметка прямого угла - библиотечная arcBetweenSegments (приём из 509658.js)
			// вместо ручного пересчёта направлений и повторного домножения на масштаб.
			// Прямой угол при вершине 0 нижнего основания; отмечаем в верхнем основании
			// (вершина 3, катеты к вершинам 4 и 5), потому что при такой камере нижнее
			// основание обращено от зрителя.
			ctx.arcBetweenSegments([
				points2D[4].x, points2D[4].y,
				points2D[3].x, points2D[3].y,
				points2D[5].x, points2D[5].y,
			], 14, true);

			// Подписи вершин: нижнее основание - просто буквы, верхнее - с индексом 1
			ctx.fillStyle = om.secondaryBrandColors.iz();
			ctx.font = '20px liberation_sans';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			let center = {
				x: points2D.reduce(function(sum, point) { return sum + point.x; }, 0) / points2D.length,
				y: points2D.reduce(function(sum, point) { return sum + point.y; }, 0) / points2D.length,
			};
			let put = function(point, letter, subscript) {
				let dx = point.x - center.x;
				let dy = point.y - center.y;
				let length = Math.sqrt(dx * dx + dy * dy) || 1;
				ctx.fillText(letter, point.x + 20 * dx / length, point.y + 20 * dy / length);
				if (subscript) {
					ctx.fillText(subscript, point.x + 20 * dx / length + 11, point.y + 20 * dy / length + 5);
				}
			};
			for (let i = 0; i < 3; i++) {
				put(points2D[i], letters[i]);
				put(points2D[i + 3], letters[i], '₁');
			}
		};

		NAtask.setTask({
			text: text,
			analys: analys,
			answers: V,
			authors: ['Селена'],
			// Список списков: именно так передают preference соседние шаблоны папки
			// (509658.js, 536908.js) и примеры с несколькими независимыми preference
			// из md/create_a_task.md.
			preference: [preference],
		});
		// variativeABC() проходит по всем строкам задания, поэтому:
		// - S и H сохраняем, иначе обозначения площади и высоты в решении заменились бы
		//   случайными буквами (получалось «$U = \frac{19 \cdot 16}{2}$» вместо «$S = ...$»);
		// - E, I, K, O, V, Z не берём в качестве вершин - именно их исключает проектный
		//   массив latbukv, чтобы буквы не путались с цифрами и другими обозначениями.
		NAtask.modifiers.variativeABC(letters, { preserve: ['S', 'H', 'E', 'I', 'K', 'O', 'V', 'Z'] });
		NAtask.modifiers.addCanvasIllustration({
			width: 400,
			height: 400,
			paint: paint1,
		});
	}, 1000);
})();
// 526994 https://mathb-ege.sdamgia.ru/problem?id=526994
