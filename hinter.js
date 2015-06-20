var util = require('util');
var roundings = require('./roundings');

function hint(glyph, ppem, strategy) {
	var upm							= strategy.UPM || 1000;

	var MIN_STEM_WIDTH         		= strategy.MIN_STEM_WIDTH;
	var MAX_STEM_WIDTH         		= strategy.MAX_STEM_WIDTH;
	var STEM_SIDE_MIN_RISE     		= strategy.STEM_SIDE_MIN_RISE || strategy.MIN_STEM_WIDTH;
	var STEM_CENTER_MIN_RISE   		= strategy.STEM_CENTER_MIN_RISE || STEM_SIDE_MIN_RISE;
	var STEM_SIDE_MIN_DESCENT  		= strategy.STEM_SIDE_MIN_DESCENT || strategy.MIN_STEM_WIDTH;
	var STEM_CENTER_MIN_DESCENT		= strategy.STEM_CENTER_MIN_DESCENT || STEM_SIDE_MIN_DESCENT;

	var POPULATION_LIMIT 			= strategy.POPULATION_LIMIT || 200;
	var CHILDREN_LIMIT   			= strategy.CHILDREN_LIMIT || 100;
	var EVOLUTION_STAGES 			= strategy.EVOLUTION_STAGES || 15;
	var MUTANT_PROBABLITY			= strategy.MUTANT_PROBABLITY || 0.4;
	var ELITE_COUNT      			= strategy.ELITE_COUNT || 10;
	
	var REBALANCE_PASSES         	= strategy.REBALANCE_PASSES || 1;
	
	var COEFF_DISTORT           	= strategy.COEFF_DISTORT || 10;

	var blueFuzz					= strategy.BLUEZONE_WIDTH || 15;

	var COLLISION_MIN_OVERLAP_RATIO	= strategy.COLLISION_MIN_OVERLAP_RATIO || 0.2;

	var PPEM_STEM_WIDTH_GEARS		= strategy.PPEM_STEM_WIDTH_GEARS || [[0, 1, 1], [13, 1, 2], [21, 2, 2], [27, 2, 3], [32, 3, 3]];
	var WIDTH_GEAR_PROPER, WIDTH_GEAR_MIN;
	for(var j = 0; j < PPEM_STEM_WIDTH_GEARS.length; j++){
		WIDTH_GEAR_PROPER = PPEM_STEM_WIDTH_GEARS[j][1];
		if(j + 1 < PPEM_STEM_WIDTH_GEARS.length && PPEM_STEM_WIDTH_GEARS[j][0] <= ppem && PPEM_STEM_WIDTH_GEARS[j + 1][0] > ppem) {
			WIDTH_GEAR_MIN = PPEM_STEM_WIDTH_GEARS[j][2];
			break;
		};
		if(j === PPEM_STEM_WIDTH_GEARS.length - 1) {
			WIDTH_GEAR_MIN = PPEM_STEM_WIDTH_GEARS[j][2]
		}
	};

	var ABLATION_IN_RADICAL     	= strategy.ABLATION_IN_RADICAL || 1;
	var ABLATION_RADICAL_EDGE   	= strategy.ABLATION_RADICAL_EDGE || 2;
	var ABLATION_GLYPH_EDGE     	= strategy.ABLATION_GLYPH_EDGE || 15;
	var ABLATION_GLYPH_HARD_EDGE	= strategy.ABLATION_GLYPH_HARD_EDGE || 25;
	
	var COEFF_PORPORTION_DISTORTION = strategy.COEFF_PORPORTION_DISTORTION || 4;

	var BLUEZONE_BOTTOM_CENTER		= strategy.BLUEZONE_BOTTOM_CENTER || -75;
	var BLUEZONE_TOP_CENTER   		= strategy.BLUEZONE_TOP_CENTER || 840;
	var BLUEZONE_BOTTOM_LIMIT 		= strategy.BLUEZONE_BOTTOM_LIMIT || -65;
	var BLUEZONE_TOP_LIMIT    		= strategy.BLUEZONE_TOP_LIMIT || 825;

	var MOST_COMMON_STEM_WIDTH		= strategy.MOST_COMMON_STEM_WIDTH || 65;

	var DONT_ADJUST_STEM_WIDTH = strategy.DONT_ADJUST_STEM_WIDTH || false;


	var shouldAddGlyphHeight = strategy.shouldAddGlyphHeight || function(stem, ppem, pixelTop, pixelBottom) {
		return stem.yori - stem.ytouch >= 0.25 * uppx
	}

	function byyori(a, b){
		return a.yori - b.yori
	}
	var stems = glyph.stems.sort(byyori);

	var round = roundings.Rtg(upm, ppem);
	var roundDown = roundings.Rdtg(upm, ppem);
	var roundUp = roundings.Rutg(upm, ppem);

	var uppx = upm / ppem;
	var pixelBottom = round(BLUEZONE_BOTTOM_CENTER);
	var pixelTop = round(BLUEZONE_TOP_CENTER);
	var glyfBottom = pixelBottom;
	var glyfTop = pixelTop;
	
	function roundDownStem(stem){
		stem.roundMethod = -1; // Positive for round up, negative for round down
		stem.ytouch = roundDown(stem.yori);
		stem.deltaY = 0
	}
	function roundUpStem(stem){
		stem.roundMethod = 1;
		stem.ytouch = roundUp(stem.yori);
		stem.deltaY = 0
	}

	function clamp(x){ return Math.min(1, Math.max(0, x)) }
	function xclamp(low, x, high){ return x < low ? low : x > high ? high : x }
	function calculateWidth(w){
		return Math.round(Math.max(WIDTH_GEAR_MIN, Math.min(WIDTH_GEAR_PROPER, w / MOST_COMMON_STEM_WIDTH * WIDTH_GEAR_PROPER))) * uppx
	}

	function atRadicalTop(stem){
		return !stem.hasSameRadicalStemAbove
			&& !(stem.hasRadicalPointAbove && stem.radicalCenterRise > STEM_CENTER_MIN_RISE)
			&& !(stem.hasRadicalLeftAdjacentPointAbove && stem.radicalLeftAdjacentRise > STEM_SIDE_MIN_RISE)
			&& !(stem.hasRadicalRightAdjacentPointAbove && stem.radicalRightAdjacentRise > STEM_SIDE_MIN_RISE)
	}
	function atGlyphTop(stem){
		return atRadicalTop(stem) && !stem.hasGlyphStemAbove 
			&& !(stem.hasGlyphPointAbove && stem.glyphCenterRise > STEM_CENTER_MIN_RISE)
			&& !(stem.hasGlyphLeftAdjacentPointAbove && stem.glyphLeftAdjacentRise > STEM_SIDE_MIN_RISE)
			&& !(stem.hasGlyphRightAdjacentPointAbove && stem.glyphRightAdjacentRise > STEM_SIDE_MIN_RISE)
	}
	function atRadicalBottom(stem){
		return !stem.hasSameRadicalStemBelow
			&& !(stem.hasRadicalPointBelow && stem.radicalCenterDescent > STEM_CENTER_MIN_DESCENT)
			&& !(stem.hasRadicalLeftAdjacentPointBelow && stem.radicalLeftAdjacentDescent > STEM_SIDE_MIN_DESCENT)
			&& !(stem.hasRadicalRightAdjacentPointBelow && stem.radicalRightAdjacentDescent > STEM_SIDE_MIN_DESCENT)
	};
	function atGlyphBottom(stem){
		return atRadicalBottom(stem) && !stem.hasGlyphStemBelow 
			&& !(stem.hasGlyphPointBelow && stem.glyphCenterDescent > STEM_CENTER_MIN_DESCENT)
			&& !(stem.hasGlyphLeftAdjacentPointBelow && stem.glyphLeftAdjacentDescent > STEM_SIDE_MIN_DESCENT)
			&& !(stem.hasGlyphRightAdjacentPointBelow && stem.glyphRightAdjacentDescent > STEM_SIDE_MIN_DESCENT)
	};
	
	var overlaps = glyph.stemOverlaps;
	var directOverlaps = glyph.directOverlaps;
	var avaliables = function(stems){
		var avaliables = []
		for(var j = 0; j < stems.length; j++) {
			var w = calculateWidth(stems[j].width);
			
			var low = round(stems[j].yori) - uppx;
			low = Math.max(low, atGlyphBottom(stems[j]) ? pixelBottom + WIDTH_GEAR_MIN * uppx : pixelBottom + WIDTH_GEAR_MIN * uppx + uppx);
			
			var high = round(stems[j].yori) + uppx;
			high = Math.min(high, atGlyphTop(stems[j]) ? pixelTop : pixelTop - uppx);
			
			var center = stems[j].yori - stems[j].width / 2 + w / 2;
			if(atGlyphTop(stems[j])) {
				var yrdtg = roundDown(stems[j].yori)
				var canAdjustUpToGlyphTop = yrdtg < Math.min(high, pixelTop - blueFuzz) && yrdtg >= pixelTop - uppx - 1;
				if(canAdjustUpToGlyphTop && stems[j].yori - yrdtg >= 0.47 * uppx) {
					// Rounding-related upward adjustment
					center += uppx
				} else if(canAdjustUpToGlyphTop && stems[j].yori - yrdtg >= 0.25 * uppx) {
					// Strategy-based upward adjustment
					center += uppx
				};
			};
			if(atGlyphBottom(stems[j]) && center < pixelBottom + w + 0.75 * uppx) {
				center = pixelBottom + w;
			};
			center = xclamp(low, center, high);
			
			if(!stems[j].hasGlyphStemBelow) {
				high = center;
			};
			if(!stems[j].hasGlyphStemAbove) {
				low = center;
			}
			
			var ablationCoeff = atGlyphTop(stems[j]) || atGlyphBottom(stems[j]) ? ABLATION_GLYPH_HARD_EDGE
							  : !stems[j].hasGlyphStemAbove || !stems[j].hasGlyphStemBelow ? ABLATION_GLYPH_EDGE
							  : !stems[j].hasSameRadicalStemAbove || !stems[j].hasSameRadicalStemBelow ? ABLATION_RADICAL_EDGE : ABLATION_IN_RADICAL;
			avaliables[j] = {
				low: Math.round(low / uppx),
				high: Math.round(high / uppx), 
				center: center, 
				ablationCoeff: ablationCoeff / uppx * (1 + 0.5 * (stems[j].xmax - stems[j].xmin) / upm),
				proportion: (stems[j].yori - stems[0].yori) / (stems[stems.length - 1].yori - stems[0].yori) || 0
			};
		};
		return avaliables;
	}(stems);
	var blanks = function(){
		var blanks = [];
		for(var j = 0; j < directOverlaps.length; j++) {
			blanks[j] = [];
			for(var k = 0; k < directOverlaps[j].length; k++) if(directOverlaps[j][k]) {
				blanks[j][k] = stems[j].yori - stems[j].width - stems[k].yori;
			}
		};
		return blanks;
	}();
	var triplets = function(){
		var triplets = [];
		for(var j = 0; j < stems.length; j++) for(var k = 0; k < j; k++) for(var w = 0; w < k; w++) if(blanks[j][k] > 0 && blanks[k][w] > 0) {
			triplets.push([j, k, w, blanks[j][k] - blanks[k][w]]);
		};
		return triplets;
	}();

	var COLLISION_FUZZ = 1.04;
	var HIGHLY_COLLISION_FUZZ = 0.3;
	function spaceBelow(stems, overlaps, k, bottom){
		var space = stems[k].ytouch - stems[k].touchwidth - bottom;
		for(var j = k - 1; j >= 0; j--){
			if(directOverlaps[k][j] && Math.abs(stems[k].ytouch - stems[j].ytouch) - stems[k].touchwidth < space)
				space = stems[k].ytouch - stems[j].ytouch - stems[k].touchwidth
		}
		return space;
	}
	function spaceAbove(stems, overlaps, k, top){
		var space = top - stems[k].ytouch;
		for(var j = k + 1; j < stems.length; j++){
			if(directOverlaps[j][k] && Math.abs(stems[j].ytouch - stems[k].ytouch) - stems[j].touchwidth < space)
				space = stems[j].ytouch - stems[k].ytouch - stems[j].touchwidth
		}
		return space;
	}
	function canBeAdjustedUp(stems, overlaps, k, distance){
		for(var j = k + 1; j < stems.length; j++){
			if(directOverlaps[j][k] && (stems[j].ytouch - stems[k].ytouch) - stems[j].touchwidth <= distance)
				return false
		}
		return true;
	}
	function canBeAdjustedDown(stems, overlaps, k, distance){
		for(var j = 0; j < k; j++){
			if(directOverlaps[k][j] && (stems[k].ytouch - stems[j].ytouch) - stems[k].touchwidth <= distance)
				return false
		}
		return true;
	}

	// Pass 1. Early Uncollide
	// In this pass we move stems to avoid collisions between them.
	// This pass is deterministic, and its result will be used as the seed in the next
	// pass.
	function earlyAllocate(y, j, allocated){
		var ymax = -999;
		// Find the high point of stems below stem j
		for(var k = 0; k < j; k++) if(directOverlaps[j][k] && y[k] > ymax){
			ymax = y[k];
		};
		var c = round(avaliables[j].center) / uppx
		if(avaliables[j].low >= ymax + 2) {
			y[j] = avaliables[j].low;
		} else if(c >= ymax + 2){
			y[j] = c
		} else if(avaliables[j].high >= ymax + 2) {
			// Place upward
			y[j] = xclamp(avaliables[j].low, ymax + 2, avaliables[j].high)
		} else if(avaliables[j].low <= ymax && avaliables[j].high >= ymax) {
			// merge
			y[j] = ymax;
		} else {
			y[j] = xclamp(avaliables[j].low, c, avaliables[j].high);
		};
		allocated[j] = true;
		for(var k = j + 1; k < stems.length; k++) if(!allocated[k]) earlyAllocate(y, k, allocated);
	}
	function earlyAdjust(stems){
		var y0 = [];
		var allocated = [];
		earlyAllocate(y0, 0, allocated);
		for(var j = 0; j < stems.length; j++) {
			stems[j].ytouch = y0[j] * uppx;
			stems[j].touchwidth = uppx;
		};

		// Adjust top stems
		var ytouchmax = stems[stems.length - 1].ytouch;
		for(var j = stems.length - 1; j >= 0; j--) if(!stems[j].hasGlyphStemAbove) {
			var stem = stems[j]
			if(atGlyphTop(stem)) {
				var canAdjustUpToGlyphTop = stem.ytouch < Math.min(avaliables[j].high * uppx, pixelTop - blueFuzz) && stem.ytouch >= pixelTop - uppx - 1;
				if(canAdjustUpToGlyphTop && stem.yori - stem.ytouch >= 0.47 * uppx) {
					// Rounding-related upward adjustment
					stem.ytouch += uppx
				} else if(canAdjustUpToGlyphTop && shouldAddGlyphHeight(stem, ppem, pixelTop, pixelBottom)) {
					// Strategy-based upward adjustment
					stem.ytouch += uppx
				};
			} else {
				if(stem.ytouch < pixelTop - blueFuzz - uppx && stem.yori - stem.ytouch >= 0.47 * uppx){
					stem.ytouch += uppx
				};
			};
		};
	};
	// Pass 2 : Uncollide
	// In this pass a genetic algorithm take place to optimize stroke placements of the glyph.
	// The optimization target is the "collision potential" evaluated using stroke position
	// state vector |y>. Due to randomized mutations, the result is not deterministic, though
	// reliable under most cases.

	function collidePotential(y, A, C, S, avaliables) {
		var p = 0;
		var n = y.length;
		for(var j = 0; j < n; j++) {
			for(var k = 0; k < j; k++) {
				if(y[j] === y[k]) p += A[j][k];
				else if(y[j] === y[k] + 1 || y[j] + 1 === y[k]) p += C[j][k];
				if(y[j] < y[k] || Math.abs(avaliables[j].center - avaliables[k].center) < 4 && y[j] !== y[k]) p += S[j][k];
			};
		};
		for(var t = 0; t < triplets.length; t++){
			var j = triplets[t][0], k = triplets[t][1], w = triplets[t][2], d = triplets[t][3];
			if(y[j] > y[k] && y[k] > y[w] && (d > 0 && y[j] - y[k] < y[k] - y[w] || d < 0 && y[j] - y[k] > y[k] - y[w])) {
				p += (A[j][k] + A[k][w]) * COEFF_DISTORT;
			}
		}
		return p;
	};
	function ablationPotential(y, A, C, S, avaliables) {
		var p = 0;
		var n = y.length;
		var ymin = ppem, ymax = -ppem;
		for(var j = 0; j < n; j++) {
			if(y[j] > ymax) ymax = y[j];
			if(y[j] < ymin) ymin = y[j];
		}
		var ymaxt = Math.max(ymax, glyfTop);
		var ymint = Math.min(ymin, glyfBottom);
		for(var j = 0; j < y.length; j++) {
			p += avaliables[j].ablationCoeff * Math.abs(y[j] * uppx - avaliables[j].center)
			p += COEFF_PORPORTION_DISTORTION * Math.abs(y[j] - (ymin + avaliables[j].proportion * (ymax - ymin)))
		};
		return p;
	};

	function Organism(y){
		this.gene = y;
		this.collidePotential = collidePotential(y, glyph.collisionMatrices.alignment, glyph.collisionMatrices.collision, glyph.collisionMatrices.swap, avaliables);
		this.ablationPotential = ablationPotential(y, glyph.collisionMatrices.alignment, glyph.collisionMatrices.collision, glyph.collisionMatrices.swap, avaliables);
		this.fitness = 1 / (1 + Math.max(0, this.collidePotential * 8 + this.ablationPotential / 16))
	};
	function crossover(father, mother) {
		var jm = father.length - 1;
		while(father[jm] === mother[jm] && jm >= 0) jm -= 1;
		if(jm < 0) return new Organism(mutant(father.slice(0)));
		var rj = Math.floor(Math.random() * (jm + 1));
		var y1 = father.slice(0, rj).concat(mother.slice(rj));
		if(Math.random() < MUTANT_PROBABLITY) mutant(y1);
		return new Organism(y1);
	};
	function mutantAt(y1, rj, pos){
		y1[rj] = pos;
	};
	function mutant(y1){
		var rj = Math.floor(Math.random() * y1.length);
		mutantAt(y1, rj, avaliables[rj].low + Math.floor(Math.random() * (avaliables[rj].high - avaliables[rj].low + 0.999)));
		return y1;
	};
	
	function selectPopulation(population){
		var res = [];
		var n = 0;
		while(n < POPULATION_LIMIT) {
			var maxFitness = 0;
			for(var j = 0; j < population.length; j++) if(population[j] && population[j].fitness > maxFitness){ 
				maxFitness = population[j].fitness 
			};
			if(maxFitness <= 0) break;
			for(var j = 0; j < population.length; j++) if(population[j] && Math.random() * maxFitness <= population[j].fitness) {
				n += 1;
				res.push(population[j]);
				population[j] = null;
			}
		};
		return res;
	}

	function evolve(population) {
		// Crossover
		var children = []
		for(var c = 0; c < POPULATION_LIMIT - population.length + CHILDREN_LIMIT; c++) {
			var father = population[0 | Math.random() * population.length].gene;
			var mother = population[0 | Math.random() * population.length].gene;
			var child = crossover(father, mother)
			if(child) children.push(child)
		};
		population = population.concat(children);
		if(population.length <= POPULATION_LIMIT) return population;
		return selectPopulation(population);
	};
	function uncollide(stems){
		if(!stems.length) return;

		var n = stems.length;
		var y0 = stems.map(function(s, j){ return xclamp(avaliables[j].low, Math.round(stems[j].ytouch / uppx), avaliables[j].high) });

		var population = [new Organism(y0)];
		// Generate initial population
		for(var j = 0; j < n; j++) {
			for(var k = avaliables[j].low; k <= avaliables[j].high; k++) if(k !== y0[j]) {
				var y1 = y0.slice(0);
				y1[j] = k;
				population.push(new Organism(y1));
			};
		};
		population.push(new Organism(y0.map(function(y, j){ return xclamp(avaliables[j].low, y - 1, avaliables[j].high) })));
		population.push(new Organism(y0.map(function(y, j){ return xclamp(avaliables[j].low, y + 1, avaliables[j].high) })));

		var elites = [new Organism(y0)];
		for(var s = 0; s < EVOLUTION_STAGES; s++) {
			population = evolve(population);
			var elite = population[0];
			for(var j = 0; j < population.length; j++) if(population[j].fitness > elite.fitness) elite = population[j];
			elites.push(elite);
			if(elite.collidePotential <= 0) break;
		};

		population = elites.concat(population);
		var best = population[0];
		for(var j = 1; j < population.length; j++) if(population[j].fitness > best.fitness) best = population[j];
		// Assign
		for(var j = 0; j < stems.length; j++){
			stems[j].ytouch = best.gene[j] * uppx;
			stems[j].touchwidth = uppx;
			stems[j].roundMethod = stems[j].ytouch >= stems[j].yori ? 1 : -1;
		};
	};

	// Pass 3 : Rebalance
	function rebalance(stems) {
		var m = stems.map(function(s, j){ return [s.xmax - s.xmin, j]}).sort(function(a, b){ return b[0]  - a[0]});
		for(var pass = 0; pass < REBALANCE_PASSES; pass++) for(var jm = 0; jm < m.length; jm++){
			var j = m[jm][1];
			if(!atGlyphTop(stems[j]) && !atGlyphBottom(stems[j])) {
				if(canBeAdjustedDown(stems, overlaps, j, 1.8 * uppx) && stems[j].ytouch - stems[j].yori > 0.6 * uppx) {
					if(stems[j].ytouch > avaliables[j].low * uppx) { 
						stems[j].ytouch -= uppx
					}
				} else if(canBeAdjustedUp(stems, overlaps, j, 1.8 * uppx) && stems[j].yori - stems[j].ytouch > 0.6 * uppx) {
					if(stems[j].ytouch < avaliables[j].high * uppx) { 
						stems[j].ytouch += uppx;
					}
				};
			};
		}
	};

	// Pass 4 : Width allocation
	function allocateWidth(stems) {
		var ytouchmin = Math.min.apply(Math, stems.map(function(s){ return s.ytouch }));
		var ytouchmax = Math.max.apply(Math, stems.map(function(s){ return s.ytouch }));
		var allocated = [];
		var properWidths = [];
		for(var j = 0; j < stems.length; j++) {
			properWidths[j] = calculateWidth(stems[j].width)
		};

		function allocateDown(j){
			var sb = spaceBelow(stems, overlaps, j, pixelBottom - uppx);
			var wr = properWidths[j];
			var w = Math.min(wr, round(stems[j].touchwidth + sb - uppx));
			if(w < uppx + 1) return;
			if(sb + stems[j].touchwidth > wr + uppx - 1 && stems[j].ytouch - wr >= pixelBottom + uppx - 1 || atGlyphBottom(stems[j]) && stems[j].ytouch - wr >= pixelBottom - 1) {
				stems[j].touchwidth = wr;
				allocated[j] = true;
			} else if(stems[j].ytouch - w >= pixelBottom + uppx - 1 || atGlyphBottom(stems[j]) && stems[j].ytouch - w >= pixelBottom - 1) {
				stems[j].touchwidth = w;
				allocated[j] = true;
			}
		};
		function allocateUp(j){
			var sb = spaceBelow(stems, overlaps, j, pixelBottom - uppx);
			var sa = spaceAbove(stems, overlaps, j, pixelTop + uppx);
			var wr = properWidths[j];
			var w = Math.min(wr, round(stems[j].touchwidth + sb + sa - 2 * uppx));
			if(w < uppx + 1) return;
			if(sa > 1.75 * uppx && stems[j].ytouch < avaliables[j].high * uppx) {
				if(sb + stems[j].touchwidth > wr - 1 && stems[j].ytouch - wr >= pixelBottom - 1 || atGlyphBottom(stems[j]) && stems[j].ytouch + uppx - wr >= pixelBottom - 1) {
					stems[j].touchwidth = wr;
					stems[j].ytouch += uppx;
					allocated[j] = true;
					stems[j].shiftedByWidthAllocation = true;
				} else if(stems[j].ytouch - w >= pixelBottom - 1 || atGlyphBottom(stems[j]) && stems[j].ytouch + uppx - w >= pixelBottom - 1) {
					stems[j].touchwidth = w;
					stems[j].ytouch += uppx;
					allocated[j] = true;
					stems[j].shiftedByWidthAllocation = true;
				}
			}
		};

		// Allowcate top and bottom stems
		for(var j = 0; j < stems.length; j++) if((atGlyphTop(stems[j]) || atGlyphBottom(stems[j])) && !allocated[j]){ allocateDown(j) };
		for(var j = stems.length - 1; j >= 0; j--) if((atGlyphTop(stems[j]) || atGlyphBottom(stems[j])) && !allocated[j]){ allocateUp(j) };

		for(var j = 0; j < stems.length; j++) if(!allocated[j]) { allocateDown(j) };
		for(var j = stems.length - 1; j >= 0; j--) if(!allocated[j]) { allocateUp(j) };
		for(var j = 0; j < stems.length; j++) if(!allocated[j]) { allocateDown(j) };
		for(var j = stems.length - 1; j >= 0; j--) if(!allocated[j]) { allocateUp(j) };
	};
	var instructions = []
	// Touching procedure
	function touchStemPoints(stems) {
		for(var j = 0; j < stems.length; j++){
			var stem = stems[j], w = stem.touchwidth;
			var sb = spaceBelow(stems, overlaps, j, pixelBottom - uppx);
			var sa = spaceAbove(stems, overlaps, j, pixelTop + uppx);

			var pos = ['ROUND', stem.posKey.id, stem.posKey.yori, Math.round(stem.posKeyAtTop ? stem.ytouch : stem.ytouch - w)];
			var adv;

			var canUseMdrp = w >= stem.width && w - stem.width <= 0.3 * uppx && w > uppx
				|| w >= stem.width && w - stem.width <= 0.2 * uppx
				|| stem.width > w && stem.width - w <= 0.25 * uppx && (sb >= 1.75 * uppx || stem.posKeyAtTop && sa >= 1.75 * uppx);

			if(false && canUseMdrp && (stem.ytouch - stem.width >= pixelBottom || atGlyphBottom(stem))) {
				adv = ['ALIGNW', stem.posKey.id, stem.advKey.id, stem.width / uppx];
			} else {
				adv = ['ALIGNW', stem.posKey.id, stem.advKey.id, stem.width / uppx, Math.round(w / uppx)]
			};
			instructions.push({
				pos: pos,
				adv: adv,
				orient: stem.posKeyAtTop
			})
		};
	};
	
	if(!stems.length) return instructions;
	for(var j = 0; j < stems.length; j++){
		stems[j].ytouch = stems[j].yori;
		stems[j].touchwidth = uppx;
	};
	(function(){
		var y0 = [];
		var y0min = avaliables[0].center / uppx;
		var y0max = avaliables[avaliables.length - 1].center / uppx;
		for(var j = 0; j < stems.length; j++){
			y0[j] = Math.round(xclamp(avaliables[j].low, y0min + (y0max - y0min) * avaliables[j].proportion, avaliables[j].high))
		}
		var og = new Organism(y0);
		if(og.collidePotential <= 0) {
			for(var j = 0; j < stems.length; j++){
				stems[j].ytouch = og.gene[j] * uppx;
				stems[j].touchwidth = uppx;
				stems[j].roundMethod = stems[j].ytouch >= stems[j].yori ? 1 : -1;
			}
		} else {
			earlyAdjust(stems);
			uncollide(stems);
			rebalance(stems);
		};
	})();
	allocateWidth(stems);
	touchStemPoints(stems);
	return instructions;
}

exports.hint = hint;