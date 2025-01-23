import {
  BaseEntity,
  Cascade, Collection,
  Entity,
  Enum,
  ManyToOne,
  MikroORM,
  OneToMany,
  PrimaryKey,
  Property,
  Unique
} from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';

export enum SchoolGrade {
  GradeOne = '1',
  GradeTwo = '2',
  GradeThree = '3',
  GradeFour = '4',
  GradeFive = '5',
  GradeSix = '6',
}

export enum SubTestType {
  AdjustVolume = 'adjustVolume',
  CompareImages = 'compareImages',
  CompareNumbers = 'compareNumbers',
}

@Entity({ tableName: 'subtests' })
export class SubTestEntity {
  @PrimaryKey({ type: 'number', autoincrement: true })
  id!: number;

  @Property()
  title!: string;

  @Enum(() => SubTestType)
  type!: SubTestType;

  @Enum({ items: () => SchoolGrade, array: true })
  grades!: SchoolGrade[];

  @OneToMany(
      () => ExerciseEntity,
      (exercise: ExerciseEntity) => exercise.subtest,
      {
        cascade: [Cascade.ALL],
        orderBy: { order: 'asc' },
      },
  )
  exercises = new Collection<ExerciseEntity>(this);
}

@Entity({ tableName: 'exercises' })
@Unique({ properties: ['order', 'subtest'] })
export class ExerciseEntity extends BaseEntity {
  @PrimaryKey({ type: 'number', autoincrement: true })
  id!: number;

  @Property()
  order!: number;

  @Enum({ items: () => SchoolGrade, array: true })
  grades!: SchoolGrade[];

  @ManyToOne(() => SubTestEntity)
  subtest!: SubTestEntity;

  @Property({ persist: true })
  get type(): SubTestType {
    return this.subtest.type;
  }
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [SubTestEntity, ExerciseEntity],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });

  MikroORM.init({
    host: '127.0.0.1',
    dbName: 'test-db',
    port: 5432,
    user: 'username',
    password: 'password',
    driver: PostgreS,
    entities: ['./dist/entities'],
    entitiesTs: ['./src/entities'],
    allowGlobalContext: true,
  })
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test('basic CRUD example', async () => {
  /* Create a Subtest for testing */
  const subtest = new SubTestEntity();
  subtest.title = 'Subtest One';
  subtest.type = SubTestType.CompareImages;
  subtest.grades = [SchoolGrade.GradeFour, SchoolGrade.GradeFive];
  for (let i: number = 0; i < 5; i++) {
    const exercise = new ExerciseEntity();
    exercise.subtest = subtest;
    exercise.order = i + 1;
    exercise.grades = [SchoolGrade.GradeFour, SchoolGrade.GradeFive];
    subtest.exercises.add(exercise);
    orm.em.persist(exercise);
  }
  await orm.em.flush();

  const searchGrade: SchoolGrade = SchoolGrade.GradeFour;

  const results = await orm.em.find(SubTestEntity, {
        grades: { $contains: [searchGrade] },
      },
      {
        populate: ['exercises'],
        populateWhere: {
          exercises: {
            grades: {
              $contains: [searchGrade],
            },
          },
        },
      });

  expect(results.length).toBe(1);
});
