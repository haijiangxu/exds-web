"""
测试Pydantic模型序列化
"""
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from webapp.services.package_service import PackageService
from webapp.tools.mongo import DATABASE
from webapp.models.retail_package import PackageListResponse

def test_model_serialization():
    """测试模型序列化"""
    print("=" * 50)
    print("测试Pydantic模型序列化")
    print("=" * 50)

    service = PackageService(DATABASE)

    # 获取数据
    result = service.list_packages(
        filters={"keyword": None, "package_type": None, "status": None},
        page=1,
        page_size=10
    )

    print(f"\nService返回的dict: {type(result)}")
    print(f"items类型: {type(result['items'])}")
    if result['items']:
        print(f"第一个item类型: {type(result['items'][0])}")
        print(f"\n第一个item内容:")
        for key, value in result['items'][0].items():
            print(f"  {key}: {value} (type: {type(value).__name__})")

    # 尝试创建Pydantic响应模型
    try:
        response_model = PackageListResponse(**result)
        print("\n✅ PackageListResponse模型创建成功")

        # 尝试序列化为JSON
        try:
            json_str = response_model.model_dump_json()
            print(f"✅ JSON序列化成功，长度: {len(json_str)}")

            # 解析JSON验证
            json_obj = json.loads(json_str)
            print(f"✅ JSON解析成功")
            print(f"\nJSON内容预览:")
            print(json.dumps(json_obj, indent=2, ensure_ascii=False)[:500])
        except Exception as e:
            print(f"\n❌ JSON序列化失败: {e}")
            import traceback
            traceback.print_exc()

    except Exception as e:
        print(f"\n❌ PackageListResponse模型创建失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        test_model_serialization()
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
