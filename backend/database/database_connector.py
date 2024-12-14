import os
import sqlite3


class DatabaseConnector:
    def __init__(self, database_file='hospital.db', sql_file='database.sql'):
        self.conn = None
        self.cursor = None
        self.database_file = database_file
        self.sql_file = sql_file

        if not os.path.exists(self.database_file):
            self.create_database()

        self.connect()

    def create_database(self):
        if not os.path.exists(self.database_file):
            try:
                self.conn = sqlite3.connect(self.database_file, check_same_thread=False)
                with open(self.sql_file, 'r') as f:
                    sql_statements = f.read()
                    self.conn.executescript(sql_statements)
                print(f'Successfully created database file {self.database_file}')
            except sqlite3.Error as e:
                print('Failed to create database:', e)
            finally:
                self.conn.close()

    def connect(self):
        try:
            self.conn = sqlite3.connect(self.database_file, check_same_thread=False)
            self.cursor = self.conn.cursor()
            print('Successfully connected to database')
        except sqlite3.Error as e:
            print('Failed to connect to database:', e)

    def select(self, table, columns='*', where=None):
        try:
            query = f"SELECT {columns} FROM {table}"
            if where:
                query += f" WHERE {where}"
            print(query)
            results = self.cursor.execute(query)
            return results.fetchall()
        except sqlite3.Error as e:
            print('Failed to execute SELECT query:', e)

    def insert(self, table, values, columns=None):
        try:
            query = f"INSERT INTO {table} {'VALUES' if columns is None else columns + 'VALUES'} ({','.join(['?']*len(values))})"
            print(query)
            self.cursor.execute(query, values)
            self.conn.commit()
            print(f'Successfully inserted values into {table}')
        except sqlite3.Error as e:
            print('Failed to execute INSERT query:', e)

    def update(self, table, set_clause, where=None, parameters=None):
        try:
            query = f"UPDATE {table} SET {set_clause}"
            if where:
                query += f" WHERE {where}"
            print(query)
            if parameters:
                self.cursor.execute(query, parameters)
            else:
                self.cursor.execute(query)
            self.conn.commit()
            print(f'Successfully updated {table}')
        except sqlite3.Error as e:
            print('Failed to execute UPDATE query:', e)

    def drop(self, table):
        try:
            query = f"DROP TABLE IF EXISTS {table}"
            print(query)
            self.cursor.execute(query)
            self.conn.commit()
            print(f'Successfully dropped {table}')
        except sqlite3.Error as e:
            print('Failed to execute DROP query:', e)

    def execute(self, query, parameters=None):
        try:
            print(query)
            if parameters:
                self.cursor.execute(query, parameters)
            else:
                self.cursor.execute(query)
            self.conn.commit()
            print('Successfully executed query')
        except sqlite3.Error as e:
            print('Failed to execute query:', e)

    def close(self):
        self.conn.close()
        print('Successfully closed database connection')


# # Example usage
# db = DatabaseConnector()

# # SELECT example
# results = db.select(table='patients', columns='*', where='age > ?', parameters=(30,))
# print(results)

# # INSERT example
# values = ('John Smith', 'male', 45, '123 Main St', 'Los Angeles')
# db.insert(table='patients', values=values)

# # UPDATE example
# set_clause = "age = 46"
# where = "name = 'John Smith'"
# db.update(table='patients', set_clause=set_clause, where=where)

# # DROP example
# db.drop(table='patients')

# # Close the database connection
# db.close()