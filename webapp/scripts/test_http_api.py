"""
测试HTTP API端点
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8005"

def get_token():
    """获取认证token"""
    response = requests.post(
        f"{BASE_URL}/token",
        data={
            "username": "admin",  # 请根据实际情况修改
            "password": "admin"   # 请根据实际情况修改
        }
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"登录失败: {response.status_code}")
        print(response.text)
        return None

def test_list_packages(token):
    """测试获取套餐列表API"""
    print("=" * 50)
    print("测试 GET /api/v1/retail-packages")
    print("=" * 50)

    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(
        f"{BASE_URL}/api/v1/retail-packages",
        headers=headers,
        params={
            "page": 1,
            "page_size": 10
        }
    )

    print(f"\n状态码: {response.status_code}")
    print(f"响应头: {dict(response.headers)}")

    if response.status_code == 200:
        print("\n✅ API调用成功!")
        data = response.json()
        print(f"总数: {data.get('total')}")
        print(f"返回套餐数: {len(data.get('items', []))}")
        if data.get('items'):
            print("\n第一个套餐:")
            print(json.dumps(data['items'][0], indent=2, ensure_ascii=False))
    else:
        print(f"\n❌ API调用失败!")
        print(f"响应内容: {response.text}")

if __name__ == "__main__":
    print("正在获取token...")
    token = get_token()

    if token:
        print(f"Token获取成功: {token[:20]}...")
        test_list_packages(token)
    else:
        print("无法获取token，跳过测试")
