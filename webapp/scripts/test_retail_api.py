"""
测试零售套餐API
"""
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from webapp.services.package_service import PackageService
from webapp.tools.mongo import DATABASE

def test_list_packages():
    """测试获取套餐列表"""
    print("=" * 50)
    print("测试获取套餐列表")
    print("=" * 50)

    service = PackageService(DATABASE)

    # 测试查询
    result = service.list_packages(
        filters={
            "keyword": None,
            "package_type": None,
            "status": None
        },
        page=1,
        page_size=10
    )

    print(f"\n总数: {result['total']}")
    print(f"当前页: {result['page']}")
    print(f"每页数量: {result['page_size']}")
    print(f"\n返回的套餐数量: {len(result['items'])}")

    if result['items']:
        print("\n第一个套餐详情:")
        first_item = result['items'][0]
        for key, value in first_item.items():
            print(f"  {key}: {value}")
    else:
        print("\n⚠️ 列表为空！")

        # 检查数据库中是否有数据
        print("\n检查数据库原始数据...")
        raw_count = DATABASE.retail_packages.count_documents({})
        print(f"数据库中套餐总数: {raw_count}")

        if raw_count > 0:
            print("\n数据库中的第一条记录:")
            first_doc = DATABASE.retail_packages.find_one()
            for key, value in first_doc.items():
                print(f"  {key}: {value}")

if __name__ == "__main__":
    try:
        test_list_packages()
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
