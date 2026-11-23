---
title: 침입 탐지·방지 시스템(IDS/IPS) 정리: 원리, 유형, 장단점, 그리고 Suricata 실습
cat: notes
date: 2026.11.23
summary: IDS/IPS의 동작 원리, 유형, 배치, 장단점, 차이점을 정리하고 Suricata로 직접 룰을 만들어 탐지해 본 학습 기록.
---

침입 탐지 및 방지 시스템(IDS/IPS)의 동작 원리, 유형, 활용 방법, 장단점, 차이점을 학습하고 정리했다. 개념의 뼈대는 NIST SP 800-94(2007)[[1]](#ref1)를 기준으로 삼았다. 발행된 지 오래된 문서이지만 탐지 방식과 유형이라는 개념 구조는 지금도 통용된다. 최신 내용은 벤더 자료로 보완했고, 개념을 눈으로 확인하기 위해 Suricata를 직접 설치해 간단한 룰로 실습했다.

---

## 1. IDS/IPS란?

IDS/IPS에 앞서 인시던트(Incident)에 대해 알고 넘어가는 게 좋다. 인시던트란 보안 정책이나 허용 가능한 사용 정책을 위반했거나 위반에 임박한 상황을 말한다. 악의적 공격뿐만 아니라 사용자가 잘못 행동해 정책을 위반한 실수까지 포함된다.

**IDS(침입 탐지 시스템, Intrusion Detection System)**는 시스템이나 네트워크에서 일어나는 이벤트(트래픽, 로그 등)를 계속 모니터링하다가 인시던트의 징후를 찾으면 기록하고 관리자에게 경고하는 시스템이다. 경고만 할 뿐 직접 막지 않는 게 포인트다.

**IPS(침입 방지 시스템, Intrusion Prevention System)**는 IDS의 모든 기능에 더해 탐지한 인시던트를 막으려고 시도하는 시스템이다. 즉 탐지하는 방식은 동일하지만 탐지 후에 막느냐 마느냐가 다르다.

**IDPS**는 IDS와 IPS가 기능이 많이 겹쳐 둘을 묶어 부르는 용어다. IPS의 방지 기능을 끄면 IDS처럼 동작한다.[[1]](#ref1)

> **IPS = IDS(탐지) + 차단**

이제 이 탐지가 어떻게 이루어지는지, 그리고 탐지 후에 둘이 어디서 갈라지는지 살펴보자.

---

## 2. 동작 원리

IDS와 IPS는 "이벤트 수집 → 분석(탐지) → 대응"의 흐름을 가진다. 앞의 두 단계는 공통이고, 마지막 대응 단계에서 갈라진다.

### 2.1 탐지: IDS와 IPS 공통

- **시그니처 기반 탐지**: 알려진 위협의 패턴(시그니처)을 관찰한 이벤트와 비교한다. 알려진 위협에는 매우 효과적이지만 새로운 공격이나 변종에는 거의 효과가 없다.[[1]](#ref1) 뒤에서 실습할 Suricata 룰이 바로 이 방식이다.
- **이상 징후 기반 탐지**: 평소 정상 활동의 프로파일을 만들고 현재 활동이 그 프로파일에서 크게 벗어나면 이상 징후로 본다. 이전에 알려지지 않은 위협을 탐지할 수 있다. 대신 정상인 활동도 프로파일에서 벗어나면 걸려서 오탐이 많다.[[1]](#ref1)
- **정책 기반 탐지**: 보안팀이 정한 정책을 위반하는 행위를 탐지한다. NIST는 이와 비슷한 개념으로, 프로토콜의 각 상태에서 허용되는 정상 활동 프로파일과 비교하는 **상태 기반 프로토콜 분석**을 소개했다.[[1]](#ref1) 실제 제품은 이 방법들을 하나만 쓰기보다 조합해서 쓴다.

### 2.2 탐지 후: 여기서 차이가 발생한다

**IDS**는 이벤트를 기록하고, 중요한 이벤트는 관리자에게 알리고(경고), 보고서를 만든다. 트래픽에는 손대지 않는다.

**IPS**는 위 기능에 더해 탐지한 위협이 성공하지 못하도록 대응을 시도한다. 방식은 세 가지다.[[1]](#ref1)

1. **공격 자체를 중단**: 연결·세션 종료, 공격자 IP 차단 등
2. **보안 환경 변경**: 방화벽, 라우터 설정을 바꿔 공격을 막기
3. **공격 내용 변경**: 이메일의 감염된 첨부파일을 제거하고 나머지를 전달하기 등

---

## 3. 유형

IDS와 IPS는 같은 기준으로 나뉜다. 유형은 무엇을 감시하고 어디에 설치되느냐에 따른 분류라서 IDS, IPS 모두에 적용된다.

| | 탐지만 (IDS) | 탐지 + 차단 (IPS) |
|---|---|---|
| **네트워크 기반** | NIDS | NIPS |
| **호스트 기반** | HIDS | HIPS |

- **네트워크 기반**: 특정 네트워크 구간이나 장치의 트래픽을 모니터링하며, 네트워크와 애플리케이션 프로토콜 활동을 분석한다. 경계 방화벽이나 라우터, VPN 서버, 원격 접속 서버 같은 네트워크 경계에 주로 배치한다.[[1]](#ref1)
- **호스트 기반**: 단일 호스트와 그 안의 이벤트를 모니터링한다. 해당 호스트를 오가는 트래픽, 시스템 로그, 실행 중인 프로세스, 파일 접근·수정, 설정 변경을 볼 수 있고, 공개 서버나 민감한 정보를 담은 서버 같은 핵심 호스트에 주로 배치한다.[[1]](#ref1) 네트워크 기반과 호스트 기반을 함께 쓰면 전체 트래픽을 보면서 중요 자산을 추가로 보호할 수 있다.

**그 밖의 유형** (자료에 따라 분류와 약어 정의가 조금씩 다르다)

- **NBA(네트워크 행위 분석)**: DDoS 공격, 웜·백도어 같은 일부 악성코드처럼 비정상적인 트래픽 흐름을 만드는 위협을 찾는다.[[1]](#ref1)
- **WIPS(무선 침입 방지 시스템)**: 무선 네트워킹 프로토콜과 관련된 의심스러운 활동을 분석한다. 승인되지 않은 사용자·장치가 회사 Wi-Fi에 접근하는지도 확인한다.[[1]](#ref1)
- **PIDS(프로토콜 기반 IDS)**: 서버와 디바이스 간의 연결 프로토콜을 모니터링한다. HTTP, HTTPS 연결을 보기 위해 웹 서버 쪽에 배치하는 경우가 많다.
- **APIDS(애플리케이션 프로토콜 기반 IDS)**: 애플리케이션 계층에서 애플리케이션별 프로토콜을 모니터링한다. SQL Injection 탐지를 위해 웹 서버와 데이터베이스 사이에 배포하는 경우가 많다.

### 배치와 트래픽 흐름

**IDS는 복사본을 본다.** IDS는 트래픽을 막거나 통과시키는 구조가 아니라 수동적으로 감시한다. 트래픽 복사본은 포트 미러링(SPAN)이나 네트워크 TAP을 통해 IDS로 전달된다.[[2]](#ref2) TAP은 패킷을 센서로 복사해 보내기만 하고, 센서로부터는 패킷을 받지 않는 전송 전용 장치다.[[3]](#ref3)

**IPS는 경로 한가운데에 놓는다(인라인).** IPS는 네트워크상에 직접 배치되어 모든 트래픽이 이곳을 통과한다.[[2]](#ref2) 그래서 직접 막을 수 있지만, 바로 이 때문에 성능 병목과 장애 시 영향이 생긴다(5장에서 다룬다).

참고로 IDS도 TCP 리셋을 이용해 TCP 기반 공격은 일부 차단할 수 있다. 다만 모든 IP, ICMP, TCP, UDP 기반의 악성 트래픽을 차단할 수 있는 것은 인라인 IPS뿐이다.[[4]](#ref4)

**3티어 구성에서의 배치 예시** (일반적인 예시이며, 실제 구성은 환경마다 다르다)

```
인터넷 ─▶ 방화벽 ─▶ [NIPS 인라인] ─▶ 웹 서버(DMZ) ─▶ WAS ─▶ DB
                                          │            │        │
                                 스위치 미러링 ─▶ [NIDS]   [HIDS/HIPS는 각 서버 안에]
```

![IDS/IPS 배치 구성도](assets/images/ids-ips/06-architecture.png)

- **경계(인라인 NIPS)**: 인터넷에서 들어오는 공격을 가장 먼저 검사하고 차단한다.
- **구간별 미러링(NIDS)**: 웹↔WAS↔DB 사이 스위치에 미러링을 걸어 서비스에 영향 없이 내부 구간을 감시한다.
- **서버 안(HIDS/HIPS)**: WAS, DB처럼 핵심 호스트에 설치해 서버 내부 활동을 본다.

그림에서 **점선(복사본)은 IDS, 실선(인라인 경로)은 IPS**라는 점이 핵심이다.

---

## 4. 활용 방법: Suricata 실습

**Suricata**는 OISF가 개발한 오픈소스 네트워크 IDS/IPS 엔진이다.[[5]](#ref5) 이 실습에서는 룰을 직접 만들어 시그니처 기반 탐지가 어떻게 동작하는지 확인했다. 환경은 Windows의 WSL2(Ubuntu)다.

### 4.1 설치

```bash
sudo apt update && sudo apt install -y suricata
suricata -V
```

설치된 버전은 Suricata 7.0.3이다.

![suricata -V 결과](assets/images/ids-ips/01-suricata-version.png)

### 4.2 룰 작성

```
alert http any any -> any any (msg:"LAB curl User-Agent detected"; flow:established,to_server; http.user_agent; content:"curl"; sid:1000001; rev:1;)
alert http any any -> any any (msg:"LAB suspicious path /admin accessed"; flow:established,to_server; http.uri; content:"/admin"; sid:1000002; rev:1;)
```

| 부분 | 의미 |
|---|---|
| `alert` | 탐지하면 경고만 남긴다 (IDS 동작) |
| `http any any -> any any` | HTTP 트래픽, 출발지 → 목적지 (모든 주소) |
| `msg` | 경고에 표시할 이름 |
| `flow:established,to_server` | 연결이 맺어진 뒤 서버로 향하는 요청만 본다 |
| `http.user_agent; content:"curl"` | User-Agent에 "curl"이 있으면 일치 |
| `http.uri; content:"/admin"` | 요청 주소에 "/admin"이 있으면 일치 |
| `sid`, `rev` | 룰의 고유 번호와 개정 번호 |

룰 문법은 다음 명령으로 검사할 수 있다.

```bash
sudo suricata -T -c /etc/suricata/suricata.yaml -S local.rules -l logs
```

![local.rules와 문법 검사 결과](assets/images/ids-ips/02-local-rules.png)

### 4.3 테스트 트래픽

실시간 캡처 대신 pcap 파일을 만들어 분석했다. 같은 입력에 같은 결과가 나와서 재현하기 쉽기 때문이다. `make_pcap.py`로 HTTP 요청 3건이 담긴 `test.pcap`을 만들었다.

| 번호 | User-Agent | 요청 주소 | 기대 결과 |
|---|---|---|---|
| ① | curl | `/index.html` | 룰 1에 걸림 |
| ② | Mozilla/5.0 | `/admin` | 룰 2에 걸림 |
| ③ | Mozilla/5.0 | `/hello` | 걸리지 않음 |

<details>
<summary>make_pcap.py 전체 보기</summary>

```python
from scapy.all import *
pk=[]
def http(sport, req):
    c,s="10.0.0.5","10.0.0.80"; seq=1000
    pk.append(Ether()/IP(src=c,dst=s)/TCP(sport=sport,dport=80,flags="S",seq=seq))
    pk.append(Ether()/IP(src=s,dst=c)/TCP(sport=80,dport=sport,flags="SA",seq=5000,ack=seq+1))
    pk.append(Ether()/IP(src=c,dst=s)/TCP(sport=sport,dport=80,flags="A",seq=seq+1,ack=5001))
    pk.append(Ether()/IP(src=c,dst=s)/TCP(sport=sport,dport=80,flags="PA",seq=seq+1,ack=5001)/Raw(req))
    resp=b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok"
    pk.append(Ether()/IP(src=s,dst=c)/TCP(sport=80,dport=sport,flags="PA",seq=5001,ack=seq+1+len(req))/Raw(resp))
http(40001,b"GET /index.html HTTP/1.1\r\nHost: test\r\nUser-Agent: curl/8.5.0\r\n\r\n")
http(40002,b"GET /admin HTTP/1.1\r\nHost: test\r\nUser-Agent: Mozilla/5.0\r\n\r\n")
http(40003,b"GET /hello HTTP/1.1\r\nHost: test\r\nUser-Agent: Mozilla/5.0\r\n\r\n")
wrpcap("test.pcap",pk)
```

우분투에서 scapy는 `sudo apt install -y python3-scapy`로 설치했다.

</details>

### 4.4 실행과 결과

```bash
sudo suricata -c /etc/suricata/suricata.yaml -S local.rules -r test.pcap -k none -l logs
cat logs/fast.log
```

![실행 출력](assets/images/ids-ips/03-run-output.png)

```
[1:1000002:1] LAB suspicious path /admin accessed [**] ... 10.0.0.5:40002 -> 10.0.0.80:80
[1:1000001:1] LAB curl User-Agent detected [**] ... 10.0.0.5:40001 -> 10.0.0.80:80
```

![fast.log 경고 2건](assets/images/ids-ips/04-fast-log.png)

`fast.log`에 경고 2건(① ②)이 찍혔고, ③은 룰에 걸리지 않아 경고가 없었다.

### 4.5 해석

- 룰에 정의한 패턴만 정확히 잡는다. ③처럼 룰에 없는 요청은 그대로 지나간다.
- ①은 User-Agent를 브라우저처럼 바꾸면 룰 1을 피할 수 있다. 이름 하나만 바꿔도 우회된다는 점이 시그니처 기반 탐지의 한계다.
- 이 실습은 `alert`만 사용했으므로 IDS 동작이다. 로그에 경고를 남길 뿐 트래픽은 건드리지 않았다.


### 4.6 IPS로 바꾸면?

직접 해 보지는 않았지만, 룰의 `alert`를 `drop`으로 바꾸고 Suricata를 트래픽 경로에 인라인으로 두면 IPS로 동작한다. 이때 오탐이 나면 정상 트래픽까지 폐기된다. 그래서 IPS로 쓰기 전에 먼저 IDS로 돌려 중요한 트래픽을 막지 않는지 확인하는 것이 좋다.[[6]](#ref6)

---

## 5. 장단점 (회피 방법 포함)

### 5.1 오탐과 미탐, 튜닝

IDPS는 완벽하게 정확할 수 없다. **오탐(false positive)**은 정상 활동을 악성으로 잘못 식별하는 것이고, **미탐(false negative)**은 악성 활동을 놓치는 것이다. 둘을 동시에 없앨 수는 없고, 하나를 줄이면 보통 다른 하나가 늘어난다. 많은 조직은 미탐을 줄이기 위해 오탐 증가를 감수한다. 탐지 정확도를 높이려고 설정을 조정하는 일을 **튜닝**이라고 한다.[[1]](#ref1)

여기서 중요한 점은 IDS와 IPS의 **오탐 발생 빈도는 같다**는 것이다. 탐지 단계가 같기 때문이다. 다른 것은 오탐이 났을 때의 피해다. IDS는 불필요한 경고가 하나 늘 뿐이지만, IPS는 정상 트래픽이 실제로 막힌다. 국내 연구 자료도 오탐의 결과가 수동적인 IDS보다 인라인 IPS에서 훨씬 심각하다고 지적한다.[[7]](#ref7)

### 5.2 IDS의 장단점

| | 내용 |
|---|---|
| **장점** | 트래픽 경로 밖에서 복사본만 보므로 서비스에 영향을 주지 않는다. 고장 나도 서비스는 그대로다. 공격 패턴을 분석해 방어를 강화하는 데 쓸 수 있다. |
| **단점** | 자동 대응이 없어 경고가 뜬 뒤에는 사람이 사후 조치해야 한다. 경고가 너무 많이 쌓이면 중요한 경고를 놓치는 경고 피로가 생긴다. 시그니처 DB를 최신으로 유지해야 한다. IDS가 멈추면 그동안은 감시 공백이 생긴다. |

### 5.3 IPS의 장단점

| | 내용 |
|---|---|
| **장점** | 탐지 즉시 자동으로 차단해 사람이 개입하기 전에 대응한다. |
| **단점** | ① **성능**: 모든 트래픽이 거쳐 가므로 트래픽이 몰리면 지연과 병목이 생긴다. ② **장애**: 인라인이라 단일 실패점이 될 수 있다.[[7]](#ref7) ③ **오탐**: 정상 트래픽이 차단돼 가용성을 해칠 수 있다. |

IPS 장애 시 동작은 설계에서 정해야 한다. 고장 났을 때 검사 없이 통과시키면(**fail-open**) 통신은 유지되지만 보안 공백이 생기고, 통신을 막으면(**fail-closed**) 서비스가 중단된다. 실제 장비도 이를 설정으로 고르게 한다. 한 벤더의 문서에서는 IPS 엔진이 한계에 이르렀을 때 fail-open을 켜면 새 세션을 검사 없이 허용하고, 기본값(꺼짐)에서는 트래픽을 차단한다고 설명한다.[[8]](#ref8)

### 5.4 비유: CCTV와 검문소

IDS는 도로 옆의 CCTV이고, IPS는 도로 한가운데의 검문소라고 생각하면 이해하기 쉽다.

- CCTV가 고장 난다고 도로가 막히지는 않는다. 다만 그동안은 아무도 지켜보지 못한다.
- 검문소는 불량 차량을 즉시 돌려보낼 수 있다. 하지만 차가 너무 몰리면 줄이 길어지고, 정상 차량을 잘못 돌려보내면 피해가 크며, 검문소가 고장 나면 도로 전체가 영향을 받는다.

가용성이 특히 중요한 환경(산업 제어 시스템 등)에서는 오히려 IDS가 더 적합한 선택일 수 있다고 보는 벤더 설명도 있다.[[9]](#ref9)

### 5.5 IDS 회피 방법

공격자는 탐지를 피하려고 다양한 방법을 쓴다. 이를 알아야 IDS/IPS의 한계를 이해할 수 있다.

| 회피 방법 | 내용 | 대응 방향 |
|---|---|---|
| **과부하** | 대량의 악의적 트래픽으로 IDS가 감당할 수준을 넘기게 해 무력화하고 그 사이에 침투한다 | 처리 용량 확보, 이중화 |
| **스푸핑** | IP 주소나 DNS 레코드를 위조해 신뢰할 수 있는 출처에서 온 트래픽처럼 보이게 한다 | 출처만으로 신뢰하지 않기, 다른 보안 장치와 연계 |
| **단편화** | 악성 페이로드를 작은 패킷으로 쪼개 시그니처를 숨긴다 | 조각을 재조합해서 검사 |
| **암호화** | 복호화 키가 없는 IDS는 암호화된 통신의 내용을 볼 수 없다 | 복호화 구간을 두는 설계 |
| **경고 폭주** | 일부러 대량의 경고를 발생시켜 대응팀이 실제 공격을 놓치게 한다 | 튜닝, SIEM에서 이벤트 연관 분석 |

대부분의 IDPS는 이런 회피 기법을 어느 정도 보완한다. 예를 들어 대상 시스템이 처리하는 방식과 똑같이 처리해, 대상이 보는 대로 "보는" 방법을 쓴다.[[1]](#ref1)

---

## 6. IDS vs IPS 차이점

![IDS와 IPS 비교 일러스트](assets/images/ids-ips/05-ids-vs-ips.jpg)
*AI로 생성한 비교 일러스트이다. IDS는 감시하고 경고하며, IPS는 검사하고 차단한다. 실제 IDS는 트래픽의 복사본(TAP/SPAN)을 받아 감시한다.*

| 구분 | IDS | IPS |
|---|---|---|
| **목적** | 침입 탐지, 가시성 확보 | 침입 탐지 + 차단 |
| **탐지 방식** | 시그니처, 이상 징후, 정책 등 | IDS와 동일 |
| **배치** | 미러링(SPAN/TAP), 트래픽 경로 밖 | 인라인, 트래픽 경로 한가운데 |
| **대응** | 기록, 경고, 보고 (사람이 조치) | 연결 종료, IP 차단, 설정 변경 등 자동 대응 |
| **오탐 시 영향** | 불필요한 경고 | 정상 트래픽 차단 |
| **장애 시 영향** | 서비스 영향 없음(감시 공백) | fail-open이면 보안 공백, fail-closed이면 서비스 중단 |
| **성능 영향** | 트래픽 경로에 영향 없음 | 지연, 병목 가능 |
| **적합한 환경** | 가용성이 중요한 환경, 먼저 탐지 규칙을 다듬는 단계 | 즉시 차단이 필요한 경계, 외부 공격 대응 |
| **Suricata 룰 예** | `alert` | `drop` |

한 줄로 줄이면 이렇다. **탐지는 같고, 탐지 뒤에 막느냐가 다르다.** 그리고 그 차이가 배치(복사본 vs 인라인)와 장단점(서비스 영향, 오탐 피해, 장애 영향)의 차이로 이어진다. 그래서 어느 쪽이 더 좋다기보다 환경에 맞게 함께 쓰는 것이 일반적이다.

---

## 7. 마무리

IPS의 허니팟 방식에 대해 더 궁금해서 학습해봤다.

허니팟은 말 그대로 꿀단지, 즉 공격자를 유인하는 미끼 시스템이다. 핵심 시스템에서 공격자를 떼어 놓고, 접근한 뒤 무엇을 하는지 관찰하는 데 쓴다.[[10]](#ref10) IPS와 연결하면 탐지한 공격 트래픽을 차단하는 대신 허니팟으로 돌려보내는 구성이 가능하다. 공격자는 공격이 통한다고 착각하고, 방어자는 그 사이 공격 수법을 배운다. 한 학술 포스터는 공격자의 정찰 단계를 탐지해 악성 트래픽을 허니팟으로 리다이렉트함으로써 운영 네트워크에 접근하지 못하게 하는 구성을 소개한다.[[11]](#ref11)

다만 이는 모든 IPS의 기본 기능이 아니라 일부 제품이나 연동 구성에서 가능한 방식이다.

이번 학습에서 정리한 핵심은 세 가지다.

1. IDS와 IPS는 **탐지 방식이 같고**, 탐지 후 **막느냐**가 다르다. (IPS = IDS + 차단)
2. 그 차이는 **배치**(미러링 vs 인라인)와 **장단점**(서비스 영향, 오탐 피해, 장애 영향)으로 이어진다.
3. 시그니처 기반 탐지는 룰에 있는 것만 잡는다. 실습에서 `/hello`가 통과한 것처럼 한계가 분명해서, 다른 탐지 방식과 보안 장치를 함께 써야 한다.

이 글은 NIST 문서(2007)를 개념의 뼈대로 삼았고, 실제 제품의 최신 동향은 다루지 못했다. 시간이 되면 암호화 트래픽 환경에서의 IDS/IPS도 더 공부해 보고 싶다.

---

## 참고자료

- <a id="ref1"></a>[1] NIST SP 800-94, *Guide to Intrusion Detection and Prevention Systems (IDPS)*, 2007. <https://csrc.nist.gov/publications/detail/sp/800-94/final>
- <a id="ref2"></a>[2] 위시켓 요즘IT, IPS·IDS·방화벽 관련 글. <https://yozm.wishket.com/magazine/detail/1781>
- <a id="ref3"></a>[3] Cisco Community, "IDS Placement". <https://community.cisco.com/t5/network-security/ids-placement/m-p/658299>
- <a id="ref4"></a>[4] 전자신문, "효율적인 IPS의 필요조건 10제". <https://www.etnews.com/200402230079>
- <a id="ref5"></a>[5] Suricata (OISF). <https://suricata.io>
- <a id="ref6"></a>[6] Rapid7, "Suricata Overview". <https://www.rapid7.com/blog/post/2017/02/21/suricata-overview/>
- <a id="ref7"></a>[7] ETRI 지식공유플랫폼, IPS 성능 평가 관련 자료. <https://ksp.etri.re.kr/ksp/article/file/34958.pdf>
- <a id="ref8"></a>[8] Fortinet Community, "IPS socket size and fail-open". <https://community.fortinet.com/t5/FortiGate/Technical-Tip-IPS-socket-size-and-fail-open/ta-p/191254>
- <a id="ref9"></a>[9] Check Point, "침입 탐지 시스템(IDS) 대 침입 방지 시스템(IPS)". <https://www.checkpoint.com/kr/cyber-hub/network-security/what-is-an-intrusion-detection-system-ids/ids-vs-ips/>
- <a id="ref10"></a>[10] HAProxy, "What is a honeypot". <https://www.haproxy.com/glossary/what-is-a-honeypot>
- <a id="ref11"></a>[11] Masaryk University, "Dragging Attackers to Honeypots for Effective Analysis of Cyber Threats" (poster). <https://is.muni.cz/publication/1188174/POSTER-Dragging_Attackers_to_Honeypots_for_Effective_Analysis_of_Cyber_Threats.pdf>
