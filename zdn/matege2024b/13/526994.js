(function () {
	'use strict';
	retryWhileError(function () {
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

		// Букв на чертеже нет: в образце задачи (официальный рисунок СдамГИА) вершины
		// не обозначены, значит и шаблон их не вводит (соглашение команды).
		let textOptions = [
			'В основании прямой призмы лежит прямоугольный треугольник с катетами, равными $' + a +
				'$ и $' + b + '$. ',
			'В основании прямой призмы лежит прямоугольный треугольник, один из катетов которого равен $' +
				a + '$, а гипотенуза равна $' + cLatex + '$. ',
		];
		let analysOptions = [
			'Площадь прямоугольного треугольника равна половине произведения катетов: $S = \\frac{' +
				a + ' \\cdot ' + b + '}{2} = ' + S + '$. ',
			'По теореме Пифагора второй катет равен $\\sqrt{' + c2 + ' - ' + a * a + '} = \\sqrt{' +
				b * b + '} = ' + b + '$. Площадь основания: $S = \\frac{' + a + ' \\cdot ' + b +
				'}{2} = ' + S + '$. ',
		];

		let text = textOptions[rand] + 'Найдите объём призмы, если её высота равна $' + h + '$.';
		let analys = analysOptions[rand] + 'Объём призмы: $V = S \\cdot h = ' + S + ' \\cdot ' + h + ' = ' + V + '$.';

		// Вершины берём у класса: после #3474 findTriangleVertices() центрирует основание
		// только в его плоскости, поэтому z нижнего основания -h/2 и верхнего +h/2 верны сами по себе.
		let vertices = prism.verticesOfFigure;

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
		autoScale(vertices, camera, vertices.map((vertex) => project3DTo2D(vertex, camera)), {
			startX: -150,
			finishX: 150,
			startY: -150,
			finishY: 150,
			maxScale: 200,
		});
		let points2D = vertices.map((vertex) => project3DTo2D(vertex, camera));

		// Матрицу смежности берём у класса и работаем с её копией: сеттер
		// connectionMatrix у IrregularTriangularPrism не работает - геттер возвращает
		// собственный литерал и игнорирует присвоенное значение.
		let matrix = prism.connectionMatrix.map((row) => row.slice());
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

		let paint1 = function (ctx) {
			ctx.translate(200, 200);
			ctx.strokeStyle = om.secondaryBrandColors.iz();
			ctx.lineWidth = 2;

			ctx.drawFigure(points2D, matrix);

			// Отметка прямого угла - библиотечная arcBetweenSegments (приём из 509658.js).
			// Отмечаем в верхнем основании (вершина 3, катеты к вершинам 4 и 5):
			// нижнее основание, где лежит вершина 0, на чертеже невидимо.
			ctx.arcBetweenSegments([
				points2D[4].x, points2D[4].y,
				points2D[3].x, points2D[3].y,
				points2D[5].x, points2D[5].y,
			], 14, true);
		};

		NAtask.setTask({
			text: text,
			analys: analys,
			answers: V,
			authors: ['chas-ege-selena'],
			preference: [preference],
		});
		NAtask.modifiers.addCanvasIllustration({
			width: 400,
			height: 400,
			paint: paint1,
		});
	}, 1000);
})();
//526994
//chas-ege-selena
//https://mathb-ege.sdamgia.ru/problem?id=526994
