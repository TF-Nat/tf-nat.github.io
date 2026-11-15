---
title: Black Hat USA 2025 | ECScape – Amazon ECS에서 IAM 권한 하이재킹 리뷰
cat: research
date: 2026.11.15
summary: ECS(EC2 모드)에서 Task 하나가 뚫리면 같은 인스턴스의 다른 Task 권한까지 탈취되는 과정과 방어 방법, 발표를 보고 느낀 점.
---

Sweet Security의 Naor Haziz가 발표한 ECScape는 EC2 모드로 돌아가는 ECS에서 Task 하나가 뚫리면 같은 인스턴스의 다른 Task 권한까지 탈취될 수 있다는 내용이다. 발표 첫머리에서 오케스트레이션 기술을 쓰는 개발자의 33%가 ECS를 쓴다는 설문을 소개했는데, 그만큼 실제 운영 환경과 가까운 이야기다.

이 글은 발표의 핵심인 공격 원리를 중심으로 정리하고, 영상을 보며 느낀 점을 덧붙였다.

- 영상: [YouTube](https://www.youtube.com/watch?v=UV-hS-DTeik)
- 발표 슬라이드: [Black Hat USA 2025 (PDF)](https://i.blackhat.com/BH-USA-25/Presentations/US-25-Haziz-ECS-cape-Hijacking-IAM-Privileges-in-Amazon-ECS-Wednesday.pdf)

## 1. 기술적 배경

발표자는 개념을 한 줄로 짚고 넘어간다. 나는 이를 더 줄여서 정리했다.

- **Task Role**: Task 안의 컨테이너가 AWS 서비스를 쓸 때 가지는 권한
- **Task Execution Role**: ECS가 이미지를 pull하거나 시크릿을 가져올 때 쓰는 권한. Task 자체는 접근할 수 없는 것이 원래 전제다.
- **Instance Role**: EC2 인스턴스 자체의 권한. ECS Agent가 사용한다.
- **ECS Agent**: 인스턴스에서 AWS Control Plane과 통신하며 "이 Task 시작해, 저건 중지해" 같은 지시를 받는다.
- **IMDS**: 인스턴스 메타데이터 서비스. Instance Role의 자격증명도 여기서 얻는다. ECS에서는 기본으로 켜져 있고 Task도 접근할 수 있다.

AWS 문서도 컨테이너는 다른 Task의 자격증명에 접근할 수 없다고 설명한다. 이 글은 그 전제가 깨진다는 이야기다.

ECS가 동작하려면 Instance Role에 특정 권한들이 필요하다. 이 중 `ecs:DiscoverPollEndpoint`와 `ecs:Poll`이 ECScape에 쓰인다. (ECS 기본 Instance Role의 권한 목록은 발표 슬라이드 참고. 출처: Black Hat USA 2025, Naor Haziz)

## 2. Story Time: 고작 3일

시작은 평범했다. 직장 동료가 "ECS Task 모니터링 가능해?"라고 물었고, 발표자는 "해보지 뭐" 하고 모니터링 센서에 ECS 지원을 붙이기 시작했다.

1. Docker 컨테이너 라벨에 필요한 정보가 거의 다 있었지만 ECS 서비스 이름만 없었다.
2. 검색해 보니 ECS Agent가 Task에 노출하는 Task Metadata Endpoint v4가 서비스 이름을 알려 줬다.
3. 그런데 Instance Role에는 서비스를 조회하는 `ecs:List` 계열 권한이 없었다. 그러면 ECS Agent는 이 정보를 어떻게 알아냈을까?
4. 프록시를 띄워 Agent의 통신을 들여다보니, Agent는 웹소켓으로 ECS에 연결하면서 `sendCredentials=true`라는 쿼리 파라미터를 쓰고 있었다. 그 웹소켓 위로 실제 Task 자격증명이 오가고 있었다.
5. "내가 Agent인 척하면 이 자격증명도 얻을 수 있지 않을까?"

매니저에게 보여 줬더니 "3일 줄 테니 해봐"라는 답이 돌아왔고, 거기서 연구가 시작되었다.

## 3. ECScape: 공격 흐름

먼저 진짜 ECS Agent가 Control Plane에 접속하는 과정을 보자.

1. `RegisterContainerInstance`로 자신을 Container Instance로 등록하고 Container Instance ARN을 받는다.
2. `DiscoverPollEndpoint`로 접속할 주소(poll endpoint URL)를 받는다.
3. 그 주소에 여러 식별자를 쿼리 파라미터로 붙여 ACS 웹소켓 요청을 만든다. ACS(Agent Communication Service)는 문서화되지 않은 AWS 내부 프로토콜이다.
4. Control Plane은 이 요청자가 `ecs:Poll` 권한이 있는지만 확인한다.
5. 통과하면 같은 인스턴스에서 도는 모든 Task와 Task Execution Role의 자격증명을 웹소켓으로 보내 준다.

그럼 Task가 Agent인 척할 수 있을까? 발표자는 막힐 때마다 우회로를 찾았다.

| 필요한 것 | 문제 | 해결 |
|---|---|---|
| DiscoverPollEndpoint 권한 | Task에는 없다 | IMDS로 Instance Role 자격증명을 얻어 Agent와 같은 권한을 확보 |
| 웹소켓 요청에 필요한 식별자들 | 흩어져 있다 | 대부분 IMDS와 Task Metadata v4에서 획득 |
| Container Instance ARN | 조회 권한이 없다. 직접 등록하면 ECS가 깨지고, 호스트 파일시스템을 마운트하는 방법은 흔한 설정이 아니다 | Container Introspection API가 알려 준다 |

최종 흐름은 이렇다.

```
IMDS → Instance Role 자격증명 획득
 → DiscoverPollEndpoint → poll endpoint URL
 → 식별자 조합 (IMDS + Task Metadata v4 + Introspection API)
 → ACS 웹소켓 접속
 → 같은 인스턴스 모든 Task / Task Execution Role 자격증명 수신
```

발표 내용을 바탕으로 직접 재구성한 흐름이다. 정확한 원본은 발표 슬라이드를 참고.

받은 자격증명은 AWS가 이미 대신 assume해 준 값이라 AssumeRole을 따로 호출할 필요가 없다. CloudTrail에서도 assume한 주체가 ECS 자신으로 보인다.

## 4. Impact와 Demo

영향은 네 가지다.

- **Task 간 IAM Role 탈취**: 권한 낮은 Task 하나만 뚫려도 같은 인스턴스의 높은 권한 Task 자격증명을 얻는다.
- **Task Execution Role 악용**: ECS 전용이라 생각해서 권한을 넉넉히 주는 경우가 많은데, 이를 탈취하면 Secrets Manager의 시크릿 같은 것을 직접 읽을 수 있다.
- **멀티테넌트의 테넌트 탈출**: 한 클러스터와 인스턴스를 나눠 쓰는 테넌트들이 IAM과 Task 분리만 믿고 있다가 경계가 무너진다.
- **ECS 내부 정보 노출**: 내부 프로토콜을 구현하므로 클러스터에 관한 메타데이터까지 볼 수 있다.

여기에 설정 오류도 필요 없다. IMDS 기본 활성화와 Instance Role 권한은 ECS의 기본 구성이기 때문이다.

데모는 두 가지였다.

- **Task Role 탈취**: `Deny *` 권한의 Task에서 S3 버킷을 삭제하면 AccessDenied가 난다. 그런데 ECScape 도구(Rust로 작성, GitHub 공개)를 실행하면 같은 인스턴스의 S3 Task 권한으로 삭제가 성공한다.
- **Task Execution Role 탈취**: DB Task의 Execution Role로 Secrets Manager의 시크릿을 읽는다. 직접 읽으면 AccessDenied지만 도구 실행 후에는 평문 값이 출력된다.

발표자는 CloudTrail 로그까지 확인해서 보여 줬다.

- DiscoverPollEndpoint 호출은 정상 인스턴스 ID와 Instance Role로 기록되어 진짜 Agent의 호출과 똑같다.
- 버킷 삭제 같은 행위는 공격 Task가 아니라 원래 그 권한을 가진 Task가 한 것처럼 남는다.
- 공격자 컨테이너의 흔적이 보이지 않는다.

## 5. Mitigation

공격에는 IMDS로 Instance Role을 얻는 단계와 Poll 권한이 필요하므로, 이 둘을 끊는 방향으로 정리하면 된다.

1. **Task의 IMDS 접근 차단**: 가장 먼저 할 일이다. 인스턴스 전체에서 IMDS를 끄면 ECS Agent도 IMDS를 쓰기 때문에 ECS가 깨진다. 그래서 Task 단위로 막아야 하고, AWS 문서에는 iptables 규칙으로 하는 방법이 있다.
2. **Task Role에 `ecs:Poll`과 `ecs:DiscoverPollEndpoint`를 부여하지 않는다.** 이 권한이 있으면 IMDS 없이도 Agent를 사칭할 수 있다. `ecs:*` 와일드카드도 이 두 권한과 또 다른 내부 권한을 포함하므로 쓰지 않고, 필요한 권한만 준다.
3. **Task Execution Role도 최소 권한으로 준다.** "ECS 전용이니 괜찮다"며 모든 Task가 공통 Role을 쓰는 경우가 있는데, ECScape로는 이 Role도 탈취할 수 있다.
4. **고권한 워크로드와 저권한 워크로드를 같은 인스턴스에서 돌리지 않는다.** Capacity Provider 설정이나 클러스터 분리로 나눌 수 있다. 멀티테넌트라면 테넌트마다 클러스터를 나누거나 최소한 EC2 인스턴스는 분리한다.

## 6. AWS의 응답과 Q&A

발표자가 AWS에 제보했을 때 AWS는 이를 자사의 보안 취약점이 아니라 고객 책임의 영역의 문제라고 답했다. Agent는 고객의 보안 경계 안에서 동작하고, 컨테이너는 보안 경계가 아니며, 인스턴스 레벨 자격증명은 고객이 막지 않는 한 접근할 수 있다는 입장이다. 대신 문서의 표현이 "컨테이너는 다른 Task의 자격증명에 접근할 수 없다"에서 "같은 인스턴스의 Task는 다른 Task의 자격증명에 접근할 수 있다"는 취지로 수정되었고, 발표자는 AWS 보안 블로그에 감사 인사가 올라갔다고 소개했다.

Q&A에서는 두 가지가 기억에 남는다.

- IMDSv2를 쓰면 영향이 있느냐는 질문에, 발표자는 Task도 같은 인스턴스에서 토큰을 받아 쓰면 되므로 본질적으로 영향이 없다고 답했다. hop limit 설정이 컨테이너에는 영향을 줄 수도 있겠지만, ECS Agent가 v2를 지원하는지는 확신하지 못한다고 했다.
- AWS가 고객에게 iptables 규칙을 직접 짜라고 하는 게 말이 되느냐는 질문에, 발표자는 AWS의 공식 입장이 고객 책임이라고 답하면서 이 모범 사례를 적용하는 것이 유일한 방어라고 했다. AWS가 추후 방어 변경을 고려하고 있다고는 했지만 확정은 아니다.

## 7. 느낀 점

### 정상 Agent와 구분이 안 되어 심각해 보였고, AWS의 입장은 모호했다

공격 요청이 진짜 ECS Agent의 호출과 똑같이 기록되고, 탈취한 자격증명으로 한 행위도 원래 Task가 한 것처럼 남는다. 이미 침해된 Task가 있어야 하지만 기본 설정에서 성립하고 사후에 찾기도 어렵다는 점에서 심각하게 느껴졌다. 그런데 AWS는 문제가 아니라고 하면서 문서는 고쳤다. 입장이 분명하지 않다고 느꼈고, 결국 사용자가 iptables까지 직접 설정해서 막아야 하는 구조라는 점도 아쉬웠다.

### 설명을 한 줄로 해내는 능력이 대단했다

발표자는 각 서비스를 한 문장으로 정의하며 넘어갔다. Service는 "이 Task를 계속 띄워 둬", ECS Agent는 "AWS Control Plane과 인스턴스를 잇는 다리"라는 식으로 군더더기가 없었다. 어떤 서비스를 깊이 이해해야만 한 줄로 설명할 수 있다는 것을 느꼈고, 그래서 설명하는 능력이 중요한 것 같다.

### 막힐 때마다 새 아이디어로 나아가는 과정이 흥미로웠다

권한이 없으면 IMDS로, ARN이 없으면 Introspection API로 이어졌다. 왜 막혔는지를 정확히 알고 있었기 때문에 우회로를 떠올릴 수 있었던 것 같다.

### CloudTrail 로그까지 검증한 점이 좋았다

취약점을 보여 주는 데서 그치지 않고, 공격이 CloudTrail에 어떻게 남는지까지 확인했다. 덕분에 "탐지가 어렵다"는 주장이 말뿐이 아니라 근거가 있는 이야기가 됐다.

### 익스플로잇 과정을 영상으로 보여 준 점이 좋았다

데모를 영상으로 준비해서 S3 버킷이 실제로 삭제되고 시크릿이 출력되는 과정을 끊김 없이 보여 줬다. 설명만 들을 때보다 정말 되는구나 하고 바로 와닿았다.

### Q&A의 IMDSv2 질문이 좋았다

방어책으로 알려진 IMDSv2가 이 공격에도 통하는지를 짚은 질문이라고 생각한다. 질문자가 발표를 정확히 이해하고 있었다는 느낌이 들었다.

## 8. 궁금했던 점: CVE는 받을 수 없을까?

발표에서는 CVE가 아니라 AWS의 감사 인사와 문서 변경이라는 형태로 크레딧을 받은 것 같아서 따로 찾아봤다. AWS도 CNA(CVE 발급 기관)라서 고객에게 공개된 AWS 서비스의 유효한 취약점에는 CVE를 발급한다. 다만 취약점이 아니라고 판단한 이슈는 대상에서 제외하는데, 이 건은 AWS가 공동 책임 모델의 문제로 보았으니 같은 맥락일 것 같다. 실제로 CVE가 발급되었는지는 확인하지 못했다.

## 마무리

ECScape가 말하는 것은 결국 하나다. Task끼리 권한이 격리된다는 믿음은 ECS의 기본 설정에서는 성립하지 않는다. 취약점 자체도 흥미로웠지만, 막힌 지점마다 이유를 파악하고 우회로를 찾아가는 과정이 가장 오래 기억에 남았다.

내가 ECS를 쓴다면 점검할 것도 정리됐다. Task의 IMDS 접근이 막혀 있는지, Task Role에 `ecs:*`가 들어 있지 않은지, 고권한 Task와 저권한 Task가 같은 인스턴스에 있지 않은지다.

## 참고

- 영상: <https://www.youtube.com/watch?v=UV-hS-DTeik>
- 발표 슬라이드: [Black Hat USA 2025 (PDF)](https://i.blackhat.com/BH-USA-25/Presentations/US-25-Haziz-ECS-cape-Hijacking-IAM-Privileges-in-Amazon-ECS-Wednesday.pdf)
- 발표자 블로그(Sweet Security): [ECScape: Understanding IAM Privilege Boundaries in Amazon ECS](https://www.sweet.security/blog/ecscape-understanding-iam-privilege-boundaries-in-amazon-ecs)
- AWS 보안 블로그: [Security considerations for running containers on Amazon ECS](https://aws.amazon.com/blogs/security/security-considerations-for-running-containers-on-amazon-ecs/)
- AWS 취약점 신고 정책(CVE 범위): [aws.amazon.com/security/vulnerability-reporting](https://aws.amazon.com/security/vulnerability-reporting)
