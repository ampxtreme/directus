import { Item } from '@directus/shared/types';
import { Knex } from 'knex';
import { JsonFieldNode } from '../../../../types';
import { getOperation } from '../../../../utils/apply-query';
import { JsonHelperDefault } from './default';

/**
 * JSON support for MariaDB 10.8+
 */
export class JsonHelperMariaDB extends JsonHelperDefault {
	preProcess(dbQuery: Knex.QueryBuilder, table: string): void {
		dbQuery
			.select(
				this.nodes.map((node) => {
					const q = this.knex.raw('?', [node.jsonPath]).toQuery();
					return this.knex.raw(`JSON_EXTRACT(??.??, ${q}) as ??`, [table, node.name, node.fieldKey]);
				})
			)
			.from(table);
	}
	postProcess(items: Item[]): void {
		this.postProcessParseJSON(items);
		this.postProcessFallback(
			items,
			this.nodes.filter((node) => {
				return Object.keys(node.query).length > 0;
			})
		);
	}
	filterQuery(collection: string, node: JsonFieldNode): Knex.Raw {
		return this.knex.raw(`JSON_EXTRACT(??.??, ?)`, [collection, node.name, node.jsonPath]);
	}
	protected override buildFilterPath(node: JsonFieldNode) {
		if (!node.query?.filter) return node.jsonPath;

		const conditions = [];
		for (const [jsonPath, value] of Object.entries(node.query?.filter)) {
			const { operator: filterOperator, value: filterValue } = getOperation(jsonPath, value);
			conditions.push(this.transformFilterJsonPath(jsonPath, filterOperator, filterValue));
		}

		return `$[?(${conditions.join(' && ')})]`;
	}
}