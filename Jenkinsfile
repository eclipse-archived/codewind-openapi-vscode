#!groovy​

pipeline {
    agent {
		kubernetes {
      		label 'node'
			yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:lts
    tty: true
    #command: [ "/usr/local/bin/uid_entrypoint" ]
    #args: [ "cat" ]
    command:
      - cat
"""
    	}
	}

	options {
        timestamps()
        skipStagesAfterUnstable()
    }

    environment {
        // https://stackoverflow.com/a/43264045
        HOME="."
    }

    stages {
        stage('Build') {
            steps {
                container("node") {
                    dir('dev') {
                        sh "npm run vscode:prepublish"
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                container("node") {

                    dir('dev') {
                        sh '''
                            npm i vsce
                            npx vsce package
                            export artifact_name="$(basename *.vsix)"
                            # rename to have datetime for clarity + prevent collisions
                            mv $artifact_name ../${artifact_name}_$(date +'%F-%H%M').vsix
                            export artifact_name="$(basename ../*.vsix)"
                        '''
                    }

                    // Update the last_build file
                    sh '''
                        commit_info="$(git log -3 --pretty='%h by %an - %s<br>')"
                        export build_info_file="last_build.txt"
                        printf "Last build: $artifact_name from $GIT_BRANCH:\n\n$commit_info" > $build_info_file
                    '''

                    // Note there must be exactly one .vsix
                    stash includes: 'last_build.txt, *.vsix', name: 'deploy'

                    sshagent (['projects-storage.eclipse.org-bot-ssh']) {
                        unstash 'deploy'
                        sh '''
                            ls -lA
                            export sshHost="genie.codewind@projects-storage.eclipse.org"
                            export deployDir="/home/data/httpd/download.eclipse.org/codewind/codewind-openapi-vscode/$(date +'%F')"
                            ssh $sshHost mkdir -p $deployDir
                            scp -v *.vsix $build_info_file ${sshHost}:${deployDir}
                        '''
                    }
                }
            }
        }
    }
}