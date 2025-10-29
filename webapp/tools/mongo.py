import os
import configparser
import json
import pymongo

import os

# --- 路径定义 ---
# 获取用户主目录
base_path = os.path.expanduser('~')
# 构建 .exds 文件夹的路径，用于存放应用相关的配置
exds_path = f'{base_path}{os.sep}.exds'
# 构建配置文件的完整路径
config_path = f'{exds_path}{os.sep}config.ini'

# 从配置文件config.ini中读取指定的配置参数。
def get_config(section, option, default_value=None):
    """
    从配置文件config.ini中读取指定的配置参数。
    如果配置项不存在，会使用提供的默认值，并将该默认值写入配置文件。

    :param section: 配置文件中的节名称 (e.g., 'MONGODB')
    :param option:  配置文件中的配置项名称 (e.g., 'uri')
    :param default_value: 当找不到配置项时返回的默认值
    :return: 配置参数对应的值
    """
    try:
        config = configparser.ConfigParser()
        # 确保配置文件存在才读取，否则直接走异常逻辑使用默认值
        if os.path.exists(config_path):
            config.read(config_path, encoding='utf-8')
            return config.get(section, option)
        else:
            # 抛出异常以触发默认值设置
            raise FileNotFoundError("Config file not found.")
    except (configparser.NoSectionError, configparser.NoOptionError, FileNotFoundError) as e:
        print(f'配置项 [{section}].{option} 不存在或文件未找到, 将使用并设置默认值。原因: {e}')
        # 如果提供了默认值，则调用 set_config 将其写入文件
        return default_value

# --- 配置读取 ---
# 优先从环境变量 MONGODB 获取主机名，如果不存在则默认为 'localhost'。
DEFAULT_DB_URI = f"mongodb://{os.getenv('MONGODB', 'localhost')}"

# 从config.ini获取URI，如果不存在，则使用并设置默认值
MONGO_URI = get_config('MONGODB', 'uri', default_value=DEFAULT_DB_URI)
# 从config.ini获取数据库名，如果不存在，则使用并设置默认值
DB_NAME = get_config('MONGODB', 'database', default_value='exds')


class DbClient:
    """
    数据库客户端类，用于封装MongoDB的连接逻辑。
    """

    def __init__(self, uri=None):
        """
        初始化客户端。
        :param uri: (可选) 如果提供，则直接使用此URI。
        """
        self.mongo_uri = uri if uri is not None else MONGO_URI

    @property
    def client(self):
        """
        使用 @property 装饰器，实现延迟连接。
        只有当第一次访问 .client 属性时，才会真正创建MongoClient实例并建立连接。
        :return: pymongo.MongoClient 实例
        """
        # print(f"Connecting to MongoDB at {self.mongo_uri}...") # 已移除此行以避免泄露密码
        return pymongo.MongoClient(self.mongo_uri)


# --- 全局单例 --- 
# 在模块加载时创建一个DbClient的全局实例
MONGO_CLIENT = DbClient()
# 直接获取数据库对象，供其他模块导入和使用
# 这样可以确保整个应用共享同一个数据库连接池
DATABASE = MONGO_CLIENT.client[DB_NAME]
# print(f"Database object '{DB_NAME}' created.") # 已移除此行以减少不必要的输出
