#!/usr/bin/env python3
"""
初始化管理员用户脚本
创建一个默认的管理员用户用于登录
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from webapp.tools.mongo import DATABASE as db
from webapp.tools.security import get_password_hash

def create_admin_user():
    """创建默认管理员用户"""

    # 检查是否已存在admin用户
    existing_user = db.users.find_one({"username": "admin"})
    if existing_user:
        print(f"管理员用户 'admin' 已存在")
        print(f"用户信息: 用户名={existing_user['username']}, 是否激活={existing_user.get('is_active', False)}")
        return

    # 创建管理员用户
    admin_user = {
        "username": "admin",
        "hashed_password": get_password_hash("admin123"),  # 默认密码: admin123
        "email": "admin@example.com",
        "full_name": "系统管理员",
        "is_active": True,
        "is_superuser": True,
        "created_at": "2025-01-08T00:00:00Z",
        "updated_at": "2025-01-08T00:00:00Z"
    }

    try:
        # 插入用户到数据库
        result = db.users.insert_one(admin_user)
        print(f"成功创建管理员用户")
        print(f"   用户名: admin")
        print(f"   密码: admin123")
        print(f"   用户ID: {result.inserted_id}")
        print(f"   请及时修改默认密码以确保安全！")

    except Exception as e:
        print(f"创建管理员用户失败: {e}")

def create_test_user():
    """创建测试用户"""

    # 检查是否已存在test用户
    existing_user = db.users.find_one({"username": "test"})
    if existing_user:
        print(f"测试用户 'test' 已存在")
        return

    # 创建测试用户
    test_user = {
        "username": "test",
        "hashed_password": get_password_hash("test123"),  # 默认密码: test123
        "email": "test@example.com",
        "full_name": "测试用户",
        "is_active": True,
        "is_superuser": False,
        "created_at": "2025-01-08T00:00:00Z",
        "updated_at": "2025-01-08T00:00:00Z"
    }

    try:
        # 插入用户到数据库
        result = db.users.insert_one(test_user)
        print(f"成功创建测试用户")
        print(f"   用户名: test")
        print(f"   密码: test123")
        print(f"   用户ID: {result.inserted_id}")

    except Exception as e:
        print(f"创建测试用户失败: {e}")

def list_users():
    """列出所有用户"""
    try:
        users = db.users.find({})
        print(f"\n数据库中的所有用户:")
        for user in users:
            print(f"   - 用户名: {user['username']}")
            print(f"     邮箱: {user.get('email', 'N/A')}")
            print(f"     全名: {user.get('full_name', 'N/A')}")
            print(f"     激活状态: {user.get('is_active', False)}")
            print(f"     超级用户: {user.get('is_superuser', False)}")
            print(f"     创建时间: {user.get('created_at', 'N/A')}")
            print()
    except Exception as e:
        print(f"获取用户列表失败: {e}")

if __name__ == "__main__":
    print("开始初始化用户...")

    # 连接到数据库
    try:
        # 测试数据库连接
        db.list_collection_names()
        print("数据库连接成功")
    except Exception as e:
        print(f"数据库连接失败: {e}")
        sys.exit(1)

    # 列出当前用户
    list_users()

    # 创建管理员用户
    create_admin_user()

    # 创建测试用户
    create_test_user()

    print("\n用户初始化完成！")
    print("\n登录信息:")
    print("   管理员账户: admin / admin123")
    print("   测试账户: test / test123")